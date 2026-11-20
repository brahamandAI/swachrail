import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { api } from './server/http.js'
import { dispatch } from './server/router.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = Number(process.env.PORT || 3000)

loadEnv(path.join(__dirname, '.env'))

const handleApi = api(['GET', 'POST', 'DELETE'], dispatch)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

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
    // Prefer .env when the key is missing or empty (PM2 sometimes leaves blank vars).
    if (!(key in process.env) || String(process.env[key] || '') === '') {
      process.env[key] = value
    }
  }
}

function parseQuery(url) {
  const q = {}
  const i = url.indexOf('?')
  if (i < 0) return q
  for (const part of url.slice(i + 1).split('&')) {
    if (!part) continue
    const [k, ...rest] = part.split('=')
    const key = decodeURIComponent(k.replace(/\+/g, ' '))
    const val = decodeURIComponent(rest.join('=').replace(/\+/g, ' '))
    if (key.endsWith('[]')) {
      const base = key.slice(0, -2)
      if (!Array.isArray(q[base])) q[base] = []
      q[base].push(val)
    } else if (q[key] !== undefined) {
      q[key] = [].concat(q[key], val)
    } else {
      q[key] = val
    }
  }
  return q
}

function readBody(req, limit = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(Object.assign(new Error('Body too large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function wrapRes(nodeRes) {
  let statusCode = 200
  const res = {
    get headersSent() {
      return nodeRes.headersSent
    },
    setHeader(name, value) {
      nodeRes.setHeader(name, value)
    },
    status(code) {
      statusCode = code
      return this
    },
    json(body) {
      if (nodeRes.headersSent) return
      const payload = JSON.stringify(body)
      nodeRes.statusCode = statusCode
      if (!nodeRes.getHeader('Content-Type')) {
        nodeRes.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
      nodeRes.end(payload)
    },
    send(body) {
      if (nodeRes.headersSent) return
      nodeRes.statusCode = statusCode
      if (Buffer.isBuffer(body) || typeof body === 'string') {
        nodeRes.end(body)
        return
      }
      nodeRes.setHeader('Content-Type', 'application/json; charset=utf-8')
      nodeRes.end(JSON.stringify(body))
    },
  }
  return res
}

async function serveStatic(req, res, pathname) {
  let filePath = path.normalize(path.join(DIST, pathname === '/' ? 'index.html' : pathname))
  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html')
  }
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404
    res.end('Not found')
    return
  }
  const ext = path.extname(filePath).toLowerCase()
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  if (pathname === '/sw.js' || pathname === '/manifest.webmanifest') {
    res.setHeader('Cache-Control', 'no-cache')
  }
  if (pathname === '/sw.js') {
    res.setHeader('Service-Worker-Allowed', '/')
  }
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer(async (nodeReq, nodeRes) => {
  try {
    const url = nodeReq.url || '/'
    const pathname = url.split('?')[0]

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      const raw = ['POST', 'PUT', 'PATCH'].includes(nodeReq.method || '')
        ? await readBody(nodeReq)
        : Buffer.alloc(0)
      let body = {}
      if (raw.length) {
        const type = String(nodeReq.headers['content-type'] || '')
        if (type.includes('application/json')) {
          try {
            body = JSON.parse(raw.toString('utf8') || '{}')
          } catch {
            nodeRes.statusCode = 400
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify({ error: 'Invalid JSON body.' }))
            return
          }
        } else {
          body = { raw: raw.toString('utf8') }
        }
      }

      const req = {
        method: nodeReq.method,
        url: pathname.replace(/^\/api\/?/, '/') || '/',
        headers: {
          ...nodeReq.headers,
          host: nodeReq.headers['x-forwarded-host'] || nodeReq.headers.host,
        },
        body,
        query: parseQuery(url),
      }
      if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
        process.env.VERCEL_ENV = 'production'
      }
      await handleApi(req, wrapRes(nodeRes))
      return
    }

    await serveStatic(nodeReq, nodeRes, pathname)
  } catch (err) {
    const status = err?.statusCode || 500
    console.error(err)
    if (!nodeRes.headersSent) {
      nodeRes.statusCode = status
      nodeRes.setHeader('Content-Type', 'application/json')
      nodeRes.end(JSON.stringify({ error: status === 413 ? 'Request too large.' : 'Server error' }))
    }
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SwachhRail listening on http://0.0.0.0:${PORT}`)
})
