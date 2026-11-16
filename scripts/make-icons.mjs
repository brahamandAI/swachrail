import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x / (size - 1), y / (size - 1))
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function inRound(nx, ny, x0, y0, x1, y1, rad) {
  if (nx < x0 || nx > x1 || ny < y0 || ny > y1) return false
  const cx = Math.min(Math.max(nx, x0 + rad), x1 - rad)
  const cy = Math.min(Math.max(ny, y0 + rad), y1 - rad)
  const dx = nx - cx
  const dy = ny - cy
  return dx * dx + dy * dy <= rad * rad
}

function wheel(nx, ny, cx, cy, r) {
  const dx = nx - cx
  const dy = ny - cy
  return dx * dx + dy * dy <= r * r
}

function paint(nx, ny) {
  const bg = [2, 6, 15, 255]
  const body = inRound(nx, ny, 0.18, 0.38, 0.82, 0.64, 0.04)
  const roof = inRound(nx, ny, 0.32, 0.28, 0.68, 0.44, 0.03)
  const inner = inRound(nx, ny, 0.2, 0.4, 0.8, 0.62, 0.03)
  const roofInner = inRound(nx, ny, 0.34, 0.3, 0.66, 0.42, 0.022)
  const rail = ny > 0.66 && ny < 0.7 && nx > 0.12 && nx < 0.88
  const win = (x0) => inRound(nx, ny, x0, 0.44, x0 + 0.1, 0.54, 0.012)
  if (wheel(nx, ny, 0.34, 0.72, 0.045)) return [53, 240, 138, 255]
  if (wheel(nx, ny, 0.66, 0.72, 0.045)) return [179, 107, 255, 255]
  if (wheel(nx, ny, 0.34, 0.72, 0.02) || wheel(nx, ny, 0.66, 0.72, 0.02)) return bg
  if (rail) return [25, 230, 255, 255]
  if (win(0.28) || win(0.45) || win(0.62)) return [25, 230, 255, 255]
  if ((body && !inner) || (roof && !roofInner)) return [25, 230, 255, 255]
  if (inner || roofInner) return [6, 22, 40, 255]
  return bg
}

function paintMaskable(nx, ny) {
  const x = (nx - 0.5) / 0.62 + 0.5
  const y = (ny - 0.5) / 0.62 + 0.5
  if (x < 0 || y < 0 || x > 1 || y > 1) return [2, 6, 15, 255]
  return paint(x, y)
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192, paint))
writeFileSync('public/icons/icon-512.png', png(512, paint))
writeFileSync('public/icons/icon-maskable-512.png', png(512, paintMaskable))
console.log('icons written')
