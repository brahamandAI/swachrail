import mongoose from 'mongoose'
import { assertMutation, fail, ok } from './http.js'
import { connectDb } from './db.js'
import { clearSessionCookie, getAuth, openSession, requireAdmin, requireAuth, stationFor } from './auth.js'
import { Record, Session, Train, User } from './models.js'
import { hashPassword, verifyPassword } from './password.js'
import { readStoredPhoto, storePhoto } from './photos.js'
import { insertRecord, photoPaths, stateResponse } from './records.js'
import { buildState } from './state.js'
import {
  accountFields,
  attendanceFields,
  cleanUser,
  employeeProfileFields,
  feedbackFields,
  inspectionFields,
  photoFields,
  placeOf,
  platformFields,
  requireDate,
  requireStation,
  stationCleanFields,
  trainNumber,
} from './validate.js'

function routeOf(req) {
  const fromQuery = req.query?.path
  if (Array.isArray(fromQuery) && fromQuery.length) return fromQuery.join('/')
  if (typeof fromQuery === 'string' && fromQuery) return fromQuery
  return String(req.url || '').split('?')[0].replace(/^\/api\/?/, '').replace(/^\//, '')
}

async function state(req, res) {
  await connectDb()
  ok(res, await buildState(await getAuth(req)))
}

async function login(req, res) {
  assertMutation(req)
  await connectDb()
  const date = requireDate(req.body?.date, 'Choose the duty date for this shift.')
  const username = cleanUser(req.body?.username)
  const user = await User.findOne({ username })
  const password = String(req.body?.password || '')
  if (!user || !(await verifyPassword(password, user.passwordHash))) fail(401, 'Username or password is incorrect.')
  const portal = String(req.body?.portal || '').trim().toLowerCase()
  if (portal === 'admin' && user.role !== 'admin') {
    fail(403, 'Feedback / staff accounts open the Feedback app only. Use Admin credentials here.')
  }
  if (portal === 'feedback' && user.role !== 'user') {
    fail(403, 'Administrator accounts open the Admin panel only. Use Feedback credentials here.')
  }
  await openSession(res, user, date)
  await stateResponse(res, {
    id: String(user._id),
    name: user.name,
    username: user.username,
    role: user.role,
    station: user.station,
    dutyDate: date,
  })
}

async function setup(req, res) {
  assertMutation(req)
  await connectDb()
  if (await User.exists({ role: 'admin' })) fail(409, 'An administrator already exists.')
  const fields = accountFields(req.body || {}, 'Enter the administrator name.')
  const date = requireDate(req.body?.date, 'Choose a station and a duty date.')
  let user
  try {
    user = await User.create({
      name: fields.name,
      username: fields.username,
      passwordHash: await hashPassword(fields.password),
      role: 'admin',
      station: fields.station,
      adminLock: 'only',
    })
  } catch (err) {
    if (err?.code === 11000) fail(409, 'An administrator already exists.')
    throw err
  }
  await openSession(res, user, date)
  await stateResponse(res, {
    id: String(user._id),
    name: user.name,
    username: user.username,
    role: user.role,
    station: user.station,
    dutyDate: date,
  })
}

async function logout(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await getAuth(req)
  if (auth?.sessionId) await Session.deleteOne({ _id: auth.sessionId })
  clearSessionCookie(res)
  await stateResponse(res, null)
}

async function duty(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  requireAdmin(auth)
  const date = requireDate(req.body?.date)
  await Session.updateOne({ _id: auth.sessionId }, { dutyDate: date })
  await stateResponse(res, { ...auth, dutyDate: date })
}

async function feedback(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await getAuth(req)
  const body = req.body || {}
  const fields = feedbackFields(body)
  const paths = await photoPaths({ imagePath: fields.image })
  await insertRecord({
    type: 'feedback',
    kind: fields.kind,
    station: auth ? stationFor(auth, body.station) : requireStation(body.station),
    date: requireDate(body.date),
    by: auth ? auth.id : 'passenger',
    byName: auth ? auth.name : fields.name,
    name: fields.name,
    phone: fields.phone,
    pnr: fields.pnr,
    train: fields.train,
    coachType: fields.coachType,
    coachNo: fields.coachNo,
    berth: fields.berth,
    quota: fields.quota,
    janitorName: fields.janitorName,
    grade: fields.grade,
    areas: fields.areas,
    grades: fields.grades,
    rating: fields.rating,
    message: fields.message,
    imagePath: paths.imagePath,
  })
  await stateResponse(res, auth)
}

async function attendance(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  const body = req.body || {}
  const fields = attendanceFields(body)
  const paths = fields.image ? await photoPaths({ imagePath: fields.image }) : { imagePath: '' }
  await insertRecord({
    type: 'attendance',
    station: stationFor(auth, body.station),
    date: requireDate(body.date),
    by: auth.id,
    byName: auth.name,
    name: fields.name,
    train: fields.train,
    shift: fields.shift,
    coachType: fields.coachType,
    designation: fields.designation,
    grade: fields.grade,
    imagePath: paths.imagePath,
    ...placeOf(body),
  })
  await stateResponse(res, auth)
}

async function photo(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  const body = req.body || {}
  const fields = photoFields(body)
  const paths = await photoPaths({ beforePath: fields.before, afterPath: fields.after })
  await insertRecord({
    type: 'photo',
    station: stationFor(auth, body.station),
    date: requireDate(body.date),
    by: auth.id,
    byName: auth.name,
    train: fields.train,
    area: fields.area,
    note: fields.note,
    coachNo: fields.coachNo,
    coachType: fields.coachType,
    janitorName: fields.janitorName,
    grade: fields.grade,
    imagePath: paths.beforePath || paths.afterPath,
    beforePath: paths.beforePath,
    afterPath: paths.afterPath,
    ...placeOf(body),
  })
  await stateResponse(res, auth)
}

async function inspection(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  const body = req.body || {}
  const fields = inspectionFields(body)
  const paths = await photoPaths({ imagePath: fields.image })
  await insertRecord({
    type: 'inspection',
    station: stationFor(auth, body.station),
    date: requireDate(body.date),
    by: auth.id,
    byName: auth.name,
    train: fields.train,
    coach: fields.coach,
    checks: fields.checks,
    note: fields.note,
    imagePath: paths.imagePath,
    ...placeOf(body),
  })
  await stateResponse(res, auth)
}

async function platform(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  const body = req.body || {}
  const fields = platformFields(body)
  const paths = await photoPaths({ imagePath: fields.image })
  await insertRecord({
    type: 'platform',
    station: stationFor(auth, body.station),
    date: requireDate(body.date),
    by: auth.id,
    byName: auth.name,
    platform: fields.platform,
    machine: fields.machine,
    waste: fields.waste,
    washed: fields.washed,
    drain: fields.drain,
    note: fields.note,
    imagePath: paths.imagePath,
    ...placeOf(body),
  })
  await stateResponse(res, auth)
}

async function stationClean(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  const body = req.body || {}
  const fields = stationCleanFields(body)
  const paths = await photoPaths({ imagePath: fields.image })
  await insertRecord({
    type: 'station-clean',
    station: stationFor(auth, body.station),
    date: requireDate(body.date),
    by: auth.id,
    byName: auth.name,
    area: fields.area,
    rating: fields.rating,
    note: fields.note,
    imagePath: paths.imagePath,
    ...placeOf(body),
  })
  await stateResponse(res, auth)
}

async function staff(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  requireAdmin(auth)
  if (req.method === 'DELETE') {
    const id = String(req.query.id || '')
    if (!id || id === auth.id) fail(400, 'That account cannot be removed.')
    const target = await User.findById(id)
    if (!target || target.role === 'admin') fail(400, 'That account cannot be removed.')
    await User.deleteOne({ _id: target._id })
    await stateResponse(res, auth)
    return
  }
  const body = req.body || {}
  const profile = employeeProfileFields(body)
  const loginUser = cleanUser(body.username || profile.employeeId || body.name)
  const fields = accountFields({
    name: body.name,
    username: loginUser,
    password: body.password,
    station: body.station,
  })
  if (await User.exists({ username: fields.username })) fail(409, 'That username / employee ID is already in use.')
  try {
    await User.create({
      name: fields.name,
      username: fields.username,
      passwordHash: await hashPassword(fields.password),
      role: 'user',
      station: fields.station,
      profile,
    })
  } catch (err) {
    if (err?.code === 11000) fail(409, 'That username / employee ID is already in use.')
    throw err
  }
  await stateResponse(res, auth)
}

async function keepPhoto(current, incoming) {
  const value = String(incoming || '')
  if (!value) return ''
  if (value.startsWith('data:')) return storePhoto(value)
  return current || ''
}

function clip(value, max = 400) {
  return String(value ?? '').trim().slice(0, max)
}

async function recordEdit(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  requireAdmin(auth)
  if (req.method === 'DELETE') {
    const id = String(req.query.id || '')
    if (!mongoose.isValidObjectId(id)) fail(404, 'Entry not found.')
    const existing = await Record.findById(id)
    if (!existing) fail(404, 'Entry not found.')
    await Record.deleteOne({ _id: existing._id })
    await stateResponse(res, auth)
    return
  }
  const body = req.body || {}
  const id = String(body.id || '')
  if (!mongoose.isValidObjectId(id)) fail(404, 'Entry not found.')
  const existing = await Record.findById(id)
  if (!existing) fail(404, 'Entry not found.')
  existing.station = requireStation(body.station)
  existing.date = requireDate(body.date)
  existing.train = clip(body.train, 12)
  existing.note = clip(body.note, 800)
  existing.name = clip(body.name, 120)
  if (body.lat === '' || body.lat == null) existing.lat = undefined
  else existing.lat = Number(body.lat)
  if (body.lng === '' || body.lng == null) existing.lng = undefined
  else existing.lng = Number(body.lng)
  if (body.placeName === '' || body.placeName == null) existing.placeName = undefined
  else existing.placeName = clip(body.placeName, 160)
  if (existing.type === 'feedback') {
    existing.kind = body.kind === 'tte' ? 'tte' : 'passenger'
    existing.phone = clip(body.phone, 20)
    existing.pnr = clip(body.pnr, 12).replace(/\s/g, '')
    existing.coachType = clip(body.coachType, 8)
    existing.coachNo = clip(body.coachNo, 12)
    existing.berth = clip(body.berth, 12)
    existing.rating = clip(body.rating, 2)
    existing.message = clip(body.message, 800)
    existing.areas = Array.isArray(body.areas) ? body.areas.map((area) => clip(area, 40)).filter(Boolean) : []
    if (body.grades && typeof body.grades === 'object') existing.grades = body.grades
    existing.imagePath = await keepPhoto(existing.imagePath, body.image)
  } else if (existing.type === 'attendance') {
    existing.shift = clip(body.shift, 20)
    existing.coachType = clip(body.coachType, 8)
    existing.designation = clip(body.designation, 40)
    existing.grade = clip(body.grade, 4)
    existing.imagePath = await keepPhoto(existing.imagePath, body.image)
  } else if (existing.type === 'photo') {
    existing.area = clip(body.area, 80)
    existing.coachNo = clip(body.coachNo, 12)
    existing.coachType = clip(body.coachType, 8)
    existing.janitorName = clip(body.janitorName, 120)
    existing.grade = clip(body.grade, 4)
    existing.beforePath = await keepPhoto(existing.beforePath, body.before || body.image)
    existing.afterPath = await keepPhoto(existing.afterPath, body.after)
  } else if (existing.type === 'inspection') {
    existing.coach = clip(body.coach, 20)
    existing.checks = body.checks && typeof body.checks === 'object' ? body.checks : existing.checks
    existing.imagePath = await keepPhoto(existing.imagePath, body.image)
  } else if (existing.type === 'platform') {
    existing.platform = clip(body.platform, 20)
    existing.machine = !!body.machine
    existing.waste = !!body.waste
    existing.washed = !!body.washed
    existing.drain = !!body.drain
    existing.imagePath = await keepPhoto(existing.imagePath, body.image)
  } else if (existing.type === 'station-clean') {
    existing.area = clip(body.area, 80)
    existing.rating = clip(body.rating, 2)
    existing.imagePath = await keepPhoto(existing.imagePath, body.image)
  }
  await existing.save()
  await stateResponse(res, auth)
}

async function accessEdit(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  requireAdmin(auth)
  const body = req.body || {}
  const id = String(body.id || '')
  if (!mongoose.isValidObjectId(id)) fail(404, 'Account not found.')
  const target = await User.findById(id)
  if (!target) fail(404, 'Account not found.')
  const name = clip(body.name, 120)
  if (name.length < 2) fail(400, 'Enter the name.')
  const username = cleanUser(body.username)
  if (username.length < 3) fail(400, 'Username must be at least 3 characters.')
  const clash = await User.findOne({ username, _id: { $ne: target._id } })
  if (clash) fail(409, 'That username is already in use.')
  const password = String(body.password || '')
  if (password && password.length < 6) fail(400, 'Password must be at least 6 characters.')
  target.name = name
  target.username = username
  target.station = requireStation(body.station)
  if (password) target.passwordHash = await hashPassword(password)
  await target.save()
  await stateResponse(res, auth)
}

async function trains(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  requireAdmin(auth)
  if (req.method === 'DELETE') {
    const station = requireStation(req.query.station)
    const number = trainNumber(req.query.number)
    await Train.deleteOne({ station, number })
    await stateResponse(res, auth)
    return
  }
  const station = requireStation(req.body?.station)
  const number = trainNumber(req.body?.number)
  if (await Train.exists({ station, number })) fail(409, 'That train is already on this station.')
  try {
    await Train.create({ station, number })
  } catch (err) {
    if (err?.code === 11000) fail(409, 'That train is already on this station.')
    throw err
  }
  await stateResponse(res, auth)
}

async function running(req, res) {
  assertMutation(req)
  await connectDb()
  const auth = await requireAuth(req)
  const body = req.body || {}
  const train = String(body.train || '').trim()
  if (!/^\d{4,6}$/.test(train)) fail(400, 'Enter a 4 to 6 digit train number.')
  const station = stationFor(auth, body.station)
  const date = requireDate(body.date)
  const existing = await Record.findOne({ type: 'running', station, date, train })
  if (existing) await Record.deleteOne({ _id: existing._id })
  else {
    await Record.create({
      type: 'running',
      station,
      date,
      train,
      at: new Date(),
      by: auth.id,
      byName: auth.name,
    })
  }
  await stateResponse(res, auth)
}

const SLOTS = { image: 'imagePath', before: 'beforePath', after: 'afterPath' }

async function media(req, res) {
  await connectDb()
  const id = String(req.query.id || '')
  const slot = String(req.query.slot || 'image')
  const pathKey = SLOTS[slot]
  if (!pathKey || !mongoose.isValidObjectId(id)) fail(404, 'Photo not found.')
  const record = await Record.findById(id)
  if (!record || !record[pathKey]) fail(404, 'Photo not found.')
  const isPublic = record.type === 'feedback' && slot === 'image'
  if (!isPublic) {
    const auth = await getAuth(req)
    if (!auth) fail(401, 'Sign in required.')
    if (auth.role !== 'admin' && auth.station !== record.station) fail(403, 'You cannot view this photo.')
  }
  const stored = await readStoredPhoto(record[pathKey])
  if (!stored || stored.statusCode !== 200 || !stored.stream) fail(404, 'Photo not found.')
  const bytes = Buffer.from(await new Response(stored.stream).arrayBuffer())
  res.setHeader('Content-Type', stored.blob.contentType || 'image/jpeg')
  res.setHeader('Cache-Control', isPublic ? 'public, max-age=300' : 'private, max-age=300')
  res.status(200).send(bytes)
}

const routes = {
  'GET state': state,
  'GET media': media,
  'POST login': login,
  'POST setup': setup,
  'POST logout': logout,
  'POST duty': duty,
  'POST feedback': feedback,
  'POST attendance': attendance,
  'POST photo': photo,
  'POST inspection': inspection,
  'POST platform': platform,
  'POST station-clean': stationClean,
  'POST staff': staff,
  'DELETE staff': staff,
  'POST trains': trains,
  'DELETE trains': trains,
  'POST running': running,
  'POST record': recordEdit,
  'DELETE record': recordEdit,
  'POST access': accessEdit,
}

export async function dispatch(req, res) {
  const handler = routes[`${req.method} ${routeOf(req)}`]
  if (!handler) fail(404, 'Not found.')
  await handler(req, res)
}
