import { get, put } from '@vercel/blob'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { fail } from './http.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DIR = path.join(__dirname, '..', 'uploads')

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || ''
}

function photoDir() {
  const dir = process.env.PHOTO_DIR || DEFAULT_DIR
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function useLocalDisk() {
  if (process.env.PHOTO_STORAGE === 'blob' && blobToken()) return false
  if (process.env.PHOTO_STORAGE === 'local') return true
  // VPS default: local disk. Vercel with token: blob.
  return !blobToken()
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/.exec(String(dataUrl || ''))
  if (!match) return null
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  if (!buffer.length) return null
  return { mime: match[1], buffer }
}

function extFor(mime) {
  if (mime === 'image/png') return '.png'
  if (mime === 'image/gif') return '.gif'
  if (mime === 'image/webp') return '.webp'
  return '.jpg'
}

function localPathFromRef(ref) {
  const name = String(ref || '').replace(/^local:/, '')
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return null
  return path.join(photoDir(), name)
}

export async function storePhoto(dataUrl) {
  if (!dataUrl) return ''
  if (String(dataUrl).startsWith('data:image/')) {
    const parsed = parseDataUrl(dataUrl)
    if (!parsed) fail(400, 'Photo could not be read.')
    if (parsed.buffer.length > 1_500_000) fail(400, 'Photo is too large.')

    if (useLocalDisk()) {
      const name = `${randomUUID()}${extFor(parsed.mime)}`
      fs.writeFileSync(localPathFromRef(name), parsed.buffer)
      return `local:${name}`
    }

    const token = blobToken()
    if (!token) return dataUrl
    const blob = await put(`swachhrail/${randomUUID()}.jpg`, parsed.buffer, {
      access: 'private',
      contentType: parsed.mime,
      token,
    })
    return blob.url
  }
  return String(dataUrl)
}

export async function readStoredPhoto(url) {
  if (!url) return null

  if (String(url).startsWith('data:image/')) {
    const parsed = parseDataUrl(url)
    if (!parsed) return null
    return {
      statusCode: 200,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(parsed.buffer)
          controller.close()
        },
      }),
      blob: { contentType: parsed.mime },
    }
  }

  if (String(url).startsWith('local:')) {
    const filePath = localPathFromRef(url)
    if (!filePath || !fs.existsSync(filePath)) return null
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mime =
      ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    return {
      statusCode: 200,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(buffer)
          controller.close()
        },
      }),
      blob: { contentType: mime },
    }
  }

  const token = blobToken()
  if (!token) fail(503, 'Photo storage is not configured.')
  return get(url, { access: 'private', token })
}
