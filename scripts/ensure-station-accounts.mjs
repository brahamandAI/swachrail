/**
 * Ensures station admin + feedback accounts.
 * Does NOT delete other cities' users.
 *
 * Run on VPS: node scripts/ensure-station-accounts.mjs
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

const CITIES = [
  {
    label: 'Bhuneshwar',
    station: 'bhuneshwar',
    migrateFrom: ['bhubaneswar'],
    accounts: [
      {
        name: 'OBHS Bhuneshwar Admin',
        username: 'OBHSBBSR',
        password: 'OBHSBBSR@2026',
        role: 'admin',
      },
      {
        name: 'OBHS Bhuneshwar Feedback',
        username: 'OBHSBBSRFB',
        password: 'OBHSBBSRFB@2026',
        role: 'user',
      },
    ],
  },
  {
    label: 'Barmer',
    station: 'barmer',
    migrateFrom: [],
    accounts: [
      {
        name: 'OBHS Barmer Admin',
        username: 'OBHSBME',
        password: 'OBHSBME@2026',
        role: 'admin',
      },
      {
        name: 'OBHS Barmer Feedback',
        username: 'OBHSBMEFB',
        password: 'OBHSBMEFB@2026',
        role: 'user',
      },
    ],
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

async function upsertAccount(User, station, account) {
  const username = account.username.toLowerCase()
  const passwordHash = await hashPassword(account.password)
  const existing = await User.findOne({ username })
  if (existing) {
    existing.name = account.name
    existing.passwordHash = passwordHash
    existing.role = account.role
    existing.station = station
    existing.adminLock = undefined
    await existing.save()
    console.log(`Updated ${account.role}: ${account.username} → ${station}`)
    return
  }
  await User.create({
    name: account.name,
    username,
    passwordHash,
    role: account.role,
    station,
  })
  console.log(`Created ${account.role}: ${account.username} → ${station}`)
}

async function main() {
  await mongoose.connect(uri)
  const User = mongoose.models.User || mongoose.model('User', UserSchema)

  for (const city of CITIES) {
    for (const account of city.accounts) {
      await upsertAccount(User, city.station, account)
    }
    if (city.migrateFrom.length) {
      const usernames = city.accounts.map((a) => a.username.toLowerCase())
      await User.updateMany(
        { username: { $in: usernames }, station: { $in: city.migrateFrom } },
        { $set: { station: city.station } }
      )
    }
  }

  console.log('\n=== STATION LOGINS ===')
  console.log('Bhuneshwar Admin     : OBHSBBSR / OBHSBBSR@2026')
  console.log('Bhuneshwar Feedback  : OBHSBBSRFB / OBHSBBSRFB@2026')
  console.log('Barmer Admin         : OBHSBME / OBHSBME@2026')
  console.log('Barmer Feedback      : OBHSBMEFB / OBHSBMEFB@2026')
  console.log('Other cities         : unchanged')
  console.log('======================')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
