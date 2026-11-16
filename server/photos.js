import { get, put } from '@vercel/blob'
import { randomUUID } from 'crypto'
import { fail } from './http.js'

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || ''
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/.exec(String(dataUrl || ''))
  if (!match) return null
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  if (!buffer.length) return null
  return { mime: match[1], buffer }
}

export async function storePhoto(dataUrl) {
  if (!dataUrl) return ''
  if (String(dataUrl).startsWith('data:image/')) {
    const parsed = parseDataUrl(dataUrl)
    if (!parsed) fail(400, 'Photo could not be read.')
    if (parsed.buffer.length > 1_500_000) fail(400, 'Photo is too large.')
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
  const token = blobToken()
  if (!token) fail(503, 'Photo storage is not configured. Set BLOB_READ_WRITE_TOKEN on the server.')
  return get(url, { access: 'private', token })
}
