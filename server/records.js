import { Record } from './models.js'
import { storePhoto } from './photos.js'
import { buildState } from './state.js'

export async function insertRecord(fields) {
  return Record.create({ ...fields, at: new Date() })
}

export async function photoPaths(images) {
  const entries = Object.entries(images)
  const stored = {}
  for (const [key, value] of entries) {
    stored[key] = value ? await storePhoto(value) : ''
  }
  return stored
}

export async function stateResponse(res, auth) {
  res.status(200).json({ state: await buildState(auth) })
}
