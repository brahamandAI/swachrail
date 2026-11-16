import { createHash, randomBytes } from 'crypto'
import { connectDb } from './db.js'
import { fail } from './http.js'
import { Session, User } from './models.js'

const COOKIE = 'sr_session'
const MAX_AGE = 14 * 24 * 60 * 60

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function readCookie(req, name) {
  const raw = req.headers.cookie || ''
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return ''
}

function cookieFlags() {
  if (process.env.VERCEL_ENV === 'production') return '; Secure'
  if (process.env.NODE_ENV === 'production') return '; Secure'
  return ''
}

export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${cookieFlags()}`
  )
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${cookieFlags()}`)
}

export async function getAuth(req) {
  await connectDb()
  const token = readCookie(req, COOKIE)
  if (!token) return null
  const session = await Session.findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } })
  if (!session) return null
  const user = await User.findById(session.userId)
  if (!user) return null
  return {
    id: String(user._id),
    name: user.name,
    username: user.username,
    role: user.role,
    station: user.station,
    dutyDate: session.dutyDate,
    sessionId: String(session._id),
  }
}

export async function requireAuth(req) {
  const auth = await getAuth(req)
  if (!auth) fail(401, 'Sign in required.')
  return auth
}

export function requireAdmin(auth) {
  if (auth.role !== 'admin') fail(403, 'Administrator only.')
}

export async function openSession(res, user, dutyDate) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000)
  await Session.create({
    tokenHash: tokenHash(token),
    userId: user._id || user.id,
    dutyDate,
    expiresAt,
  })
  setSessionCookie(res, token)
}

export function stationFor(auth, requested) {
  if (auth.role === 'user') return auth.station
  const station = String(requested || '').trim()
  if (!station || station === 'all') return auth.station
  return station
}
