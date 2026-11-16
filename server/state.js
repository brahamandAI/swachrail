import { maskPhone, maskPnr } from './mask.js'
import { Record, Train, User } from './models.js'

function media(id, slot, path) {
  if (!path) return ''
  return `/api/media?id=${id}&slot=${slot}`
}

export function toClientRecord(doc, { mask }) {
  const id = String(doc._id)
  const row = {
    id,
    type: doc.type,
    station: doc.station,
    date: doc.date,
    at: new Date(doc.at).toISOString(),
    by: doc.by || '',
    byName: doc.byName || '',
    lat: doc.lat ?? null,
    lng: doc.lng ?? null,
    placeName: doc.placeName || '',
    image: media(id, 'image', doc.imagePath),
    before: media(id, 'before', doc.beforePath),
    after: media(id, 'after', doc.afterPath),
  }
  if (doc.type === 'feedback') {
    row.kind = doc.kind || 'passenger'
    row.name = doc.name || ''
    row.phone = mask ? maskPhone(doc.phone) : doc.phone || ''
    row.pnr = mask ? maskPnr(doc.pnr) : doc.pnr || ''
    row.train = doc.train || ''
    row.coachType = doc.coachType || ''
    row.coachNo = doc.coachNo || ''
    row.berth = doc.berth || ''
    row.quota = doc.quota || ''
    row.janitorName = doc.janitorName || ''
    row.grade = doc.grade || ''
    row.areas = doc.areas || []
    row.grades = doc.grades || {}
    row.rating = doc.rating || ''
    row.message = doc.message || ''
  } else if (doc.type === 'attendance') {
    row.name = doc.name || ''
    row.train = doc.train || ''
    row.shift = doc.shift || ''
    row.coachType = doc.coachType || ''
    row.designation = doc.designation || ''
    row.grade = doc.grade || ''
  } else if (doc.type === 'photo') {
    row.train = doc.train || ''
    row.area = doc.area || ''
    row.note = doc.note || ''
    row.coachNo = doc.coachNo || ''
    row.coachType = doc.coachType || ''
    row.janitorName = doc.janitorName || ''
    row.grade = doc.grade || ''
  } else if (doc.type === 'running') {
    row.train = doc.train || ''
  } else if (doc.type === 'inspection') {
    row.train = doc.train || ''
    row.coach = doc.coach || ''
    row.checks = doc.checks || {}
    row.note = doc.note || ''
  } else if (doc.type === 'platform') {
    row.platform = doc.platform || ''
    row.machine = !!doc.machine
    row.waste = !!doc.waste
    row.washed = !!doc.washed
    row.drain = !!doc.drain
    row.note = doc.note || ''
  } else if (doc.type === 'station-clean') {
    row.area = doc.area || ''
    row.rating = doc.rating || ''
    row.note = doc.note || ''
  }
  return row
}

function groupTrains(docs) {
  const trains = {}
  for (const doc of docs) {
    trains[doc.station] = trains[doc.station] || []
    trains[doc.station].push(doc.number)
  }
  return trains
}

function publicUser(doc) {
  return {
    id: String(doc._id || doc.id),
    name: doc.name,
    username: doc.username,
    role: doc.role,
    station: doc.station,
    profile: doc.profile && typeof doc.profile === 'object' ? doc.profile : {},
  }
}

export async function buildState(auth) {
  const adminExists = await User.exists({ role: 'admin' })
  if (!auth) {
    const records = await Record.find({ type: 'feedback' }).sort({ at: -1 }).limit(2000)
    return {
      needsSetup: !adminExists,
      user: null,
      dutyDate: null,
      users: [],
      trains: {},
      records: records.map((record) => toClientRecord(record, { mask: true })),
    }
  }
  const scope = auth.role === 'admin' ? {} : { station: auth.station }
  const [records, trainDocs, users] = await Promise.all([
    Record.find(scope).sort({ at: -1 }).limit(auth.role === 'admin' ? 5000 : 2000),
    Train.find(scope).sort({ number: 1 }),
    auth.role === 'admin'
      ? User.find().select('name username role station')
      : User.find({ _id: auth.id }).select('name username role station'),
  ])
  return {
    needsSetup: !adminExists,
    user: publicUser(auth),
    dutyDate: auth.dutyDate,
    users: users.map(publicUser),
    trains: groupTrains(trainDocs),
    records: records.map((record) => toClientRecord(record, { mask: false })),
  }
}
