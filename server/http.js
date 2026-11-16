export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function fail(status, message) {
  throw new HttpError(status, message)
}

export function assertOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return
  let host = ''
  try {
    host = new URL(origin).host
  } catch {
    fail(403, 'Rejected request.')
  }
  if (host !== req.headers.host) fail(403, 'Rejected request.')
}

export function assertMutation(req) {
  assertOrigin(req)
  if (req.headers['x-swachhrail'] !== '1') fail(403, 'Rejected request.')
}

export function api(methods, fn) {
  return async function handler(req, res) {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '))
        return res.status(405).json({ error: 'Method not allowed' })
      }
      await fn(req, res)
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500
      if (status >= 500 && !(err instanceof HttpError)) {
        console.error([err?.name, err?.code, err?.codeName].filter(Boolean).join(' ') || 'Unhandled server error')
      } else if (status >= 500) {
        console.error(err.message)
      }
      const message = err instanceof HttpError ? err.message : databaseMessage(err)
      if (!res.headersSent) res.status(status).json({ error: message })
    }
  }
}

export function ok(res, body) {
  res.status(200).json(body)
}

function databaseMessage(err) {
  const name = String(err?.name || '')
  const codeName = String(err?.codeName || '')
  if (name === 'MongoParseError') return 'The database address is not valid. Check MONGODB_URI.'
  if (codeName === 'AuthenticationFailed' || err?.code === 18 || err?.code === 8000) return 'Database username or password was rejected.'
  if (name === 'MongoServerSelectionError' || name === 'MongoNetworkError') return 'The server could not reach the database. Allow 0.0.0.0/0 in Network Access.'
  return 'Server error'
}
