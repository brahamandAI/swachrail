import { useEffect, useRef } from 'react'
import { DAYS, fmt } from '../data.js'

function fit(c) {
  const r = c.getBoundingClientRect()
  const d = window.devicePixelRatio || 1
  c.width = r.width * d
  c.height = r.height * d
  const x = c.getContext('2d')
  x.scale(d, d)
  return [x, r.width, r.height]
}

export function LineChart({ data }) {
  const ref = useRef(null)
  useEffect(() => {
    const [x, w, h] = fit(ref.current)
    const mx = Math.max(1, ...data.w)
    const p = 24
    x.clearRect(0, 0, w, h)
    x.strokeStyle = '#d7e0ea'
    for (let i = 0; i < 4; i++) {
      x.beginPath()
      x.moveTo(0, p + (i * (h - 2 * p)) / 3)
      x.lineTo(w, p + (i * (h - 2 * p)) / 3)
      x.stroke()
    }
    x.strokeStyle = data.col
    x.lineWidth = 2.5
    x.beginPath()
    data.w.forEach((v, i) => {
      const X = 20 + (i * (w - 40)) / 6
      const Y = h - p - (v / mx) * (h - 2 * p)
      i ? x.lineTo(X, Y) : x.moveTo(X, Y)
    })
    x.stroke()
    data.w.forEach((v, i) => {
      const X = 20 + (i * (w - 40)) / 6
      const Y = h - p - (v / mx) * (h - 2 * p)
      x.fillStyle = data.col
      x.beginPath()
      x.arc(X, Y, 3.5, 0, 7)
      x.fill()
      x.fillStyle = '#52657a'
      x.font = '11px sans-serif'
      x.fillText(DAYS[i], X - 10, h - 6)
    })
  }, [data])
  return <canvas ref={ref} className="ch" />
}

export function OpsMixChart({ D }) {
  const ref = useRef(null)
  useEffect(() => {
    const [x, w, h] = fit(ref.current)
    const pct = (v) => (D.total ? Math.round((v / D.total) * 100) : 0)
    const p = [
      [D.feedback.t, '#2f9e6b', 'Feedback ' + pct(D.feedback.t) + '%'],
      [D.attendance.t, '#3b4f9a', 'Attendance ' + pct(D.attendance.t) + '%'],
      [D.photos.t, '#d97706', 'Photos ' + pct(D.photos.t) + '%'],
    ]
    const r = Math.min(h / 2 - 8, 70)
    const cx = r + 14
    let s = -Math.PI / 2
    if (D.total) p.forEach((q) => {
      const e = s + (q[0] / D.total) * 6.283
      x.strokeStyle = q[1]
      x.lineWidth = 18
      x.beginPath()
      x.arc(cx, h / 2, r - 11, s, e - 0.03)
      x.stroke()
      s = e
    })
    x.fillStyle = '#0f3d5c'
    x.font = 'bold 20px sans-serif'
    x.textAlign = 'center'
    x.fillText(fmt(D.total), cx, h / 2 + 2)
    x.font = '11px sans-serif'
    x.fillStyle = '#52657a'
    x.fillText('Records Today', cx, h / 2 + 18)
    x.textAlign = 'left'
    const legend = [
      ...p,
      [0, '#0f5f8a', `Train coverage ${D.trains.run}/${D.trains.total} (${D.trains.total ? Math.round((D.trains.run / D.trains.total) * 100) : 0}%)`],
    ]
    legend.forEach((q, i) => {
      x.fillStyle = q[1]
      x.fillRect(cx + r + 24, 30 + i * 30, 12, 12)
      x.fillStyle = '#314556'
      x.font = '13px sans-serif'
      x.fillText(q[2], cx + r + 44, 41 + i * 30)
    })
  }, [D])
  return <canvas ref={ref} className="ch" />
}
