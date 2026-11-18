/**
 * Adds Bhubaneswar admin + feedback accounts only.
 * Does NOT delete or change Jodhpur / other existing users.
 *
 * Run on VPS: node scripts/ensure-bbsr-accounts.mjs
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

const STATION = 'bhubaneswar'

const ACCOUNTS = [
  {
    name: 'OBHS Bhubaneswar Admin',
    username: 'OBHSBBSR',
    password: 'OBHSBBSR@2026',
    role: 'admin',
    station: STATION,
  },
  {
    name: 'OBHS Bhubaneswar Feedback',
    username: 'OBHSBBSRFB',
    password: 'OBHSBBSRFB@2026',
    role: 'user',
    station: STATION,
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

async function main() {
  await mongoose.connect(uri)
  const User = mongoose.models.User || mongoose.model('User', UserSchema)

  for (const account of ACCOUNTS) {
    const username = account.username.toLowerCase()
    const existing = await User.findOne({ username })
    const passwordHash = await hashPassword(account.password)
    if (existing) {
      existing.name = account.name
      existing.passwordHash = passwordHash
      existing.role = account.role
      existing.station = account.station
      existing.adminLock = undefined
      await existing.save()
      console.log(`Updated ${account.role}: ${account.username}`)
    } else {
      await User.create({
        name: account.name,
        username,
        passwordHash,
        role: account.role,
        station: account.station,
      })
      console.log(`Created ${account.role}: ${account.username}`)
    }
  }

  console.log('\n=== BHUBANESWAR LOGIN ===')
  console.log('Admin     (#admin)    : OBHSBBSR / OBHSBBSR@2026')
  console.log('Feedback  (#feedback) : OBHSBBSRFB / OBHSBBSRFB@2026')
  console.log('Station               : Bhubaneswar only')
  console.log('Other cities          : unchanged')
  console.log('=========================')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
