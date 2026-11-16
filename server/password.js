import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(scryptCb)

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt}$${hash.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hex] = String(stored || '').split('$')
  if (scheme !== 'scrypt' || !salt || !hex) return false
  const actual = await scrypt(password, salt, 64)
  const expected = Buffer.from(hex, 'hex')
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
