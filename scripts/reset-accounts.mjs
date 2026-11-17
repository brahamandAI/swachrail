/**
 * Wipes login users + sessions, then creates separate Admin and Feedback accounts.
 * Run on VPS: node scripts/reset-accounts.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { hashPassword } from '../server/password.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    const key = trimmed.slice(0, i).trim()
    let value = trimmed.slice(i + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnv(path.join(root, '.env'))

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI missing in .env')
  process.exit(1)
}

const ACCOUNTS = [
  {
    name: 'Rail Survey Admin',
    username: 'admin.rs',
    password: 'RsAdmin@2026',
    role: 'admin',
    station: 'jodhpur',
    adminLock: 'only',
  },
  {
    name: 'Feedback Staff',
    username: 'feedback.rs',
    password: 'RsFeedback@2026',
    role: 'user',
    station: 'jodhpur',
  },
]

const UserSchema = new mongoose.Schema(
  {
    name: String,
    username: { type: String, unique: true },
    passwordHash: String,
    role: String,
    station: String,
    adminLock: String,
    profile: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
)
UserSchema.index({ adminLock: 1 }, { unique: true, sparse: true })

const SessionSchema = new mongoose.Schema({
  tokenHash: String,
  userId: mongoose.Schema.Types.ObjectId,
  dutyDate: String,
  expiresAt: Date,
})

async function main() {
  await mongoose.connect(uri)
  const User = mongoose.models.User || mongoose.model('User', UserSchema)
  const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema)

  const removedUsers = await User.deleteMany({})
  const removedSessions = await Session.deleteMany({})
  console.log(`Removed users: ${removedUsers.deletedCount}, sessions: ${removedSessions.deletedCount}`)

  for (const account of ACCOUNTS) {
    await User.create({
      name: account.name,
      username: account.username,
      passwordHash: await hashPassword(account.password),
      role: account.role,
      station: account.station,
      ...(account.adminLock ? { adminLock: account.adminLock } : {}),
    })
    console.log(`Created ${account.role}: ${account.username}`)
  }

  console.log('\n=== NEW LOGIN CREDENTIALS ===')
  console.log('Admin panel  (#admin)')
  console.log('  Username: admin.rs')
  console.log('  Password: RsAdmin@2026')
  console.log('Feedback app (#feedback)')
  console.log('  Username: feedback.rs')
  console.log('  Password: RsFeedback@2026')
  console.log('=============================')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
