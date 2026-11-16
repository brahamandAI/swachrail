import { CITY } from './stations.js'

export { CITY }

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const COLORS = { feedback: '#35f08a', attendance: '#b36bff', photos: '#ff8a1f' }

export const fmt = (n) => Number(n || 0).toLocaleString('en-US')

export function isoDate(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

export function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso || ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function stationName(id) {
  if (!id) return ''
  if (id === 'all') return 'All stations'
  if (CITY[id]?.n) return CITY[id].n
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function series(list, match, dateStr, month, weekDates, col) {
  const ofType = list.filter(match)
  const onDate = ofType.filter((r) => r.date === dateStr)
  const inMonth = ofType.filter((r) => r.date.startsWith(month))
  const w = weekDates.map((d) => ofType.filter((r) => r.date === d).length)
  const peakIdx = w.reduce((best, v, i) => (v > w[best] ? i : best), 0)
  const [y, m] = month.split('-').map(Number)
  const dim = new Date(y, m, 0).getDate() || 1
  return {
    t: onDate.length,
    m: inMonth.length,
    avg: Math.round(inMonth.length / dim),
    peak: w[peakIdx] > 0 ? DAYS[peakIdx] : '—',
    w,
    col,
  }
}

export function trainEntries(trainMap, station) {
  if (station !== 'all') return (trainMap[station] || []).map((no) => ({ station, no }))
  return Object.entries(trainMap).flatMap(([st, list]) => (list || []).map((no) => ({ station: st, no })))
}

export function statsFor(records, trainMap, station, dateStr) {
  const day = new Date(`${dateStr}T12:00:00`)
  const month = dateStr.slice(0, 7)
  const dow = (day.getDay() + 6) % 7
  const monday = new Date(day)
  monday.setDate(day.getDate() - dow)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return isoDate(d)
  })
  const back = new Date(day)
  back.setDate(day.getDate() - 6)
  const from = isoDate(back)
  const list = records.filter((r) => station === 'all' || r.station === station)
  const feedback = series(list, (r) => r.type === 'feedback', dateStr, month, weekDates, COLORS.feedback)
  const attendance = series(list, (r) => r.type === 'attendance', dateStr, month, weekDates, COLORS.attendance)
  const inspections = series(list, (r) => r.type === 'inspection', dateStr, month, weekDates, '#0f5f8a')
  const photos = series(
    list,
    (r) => r.type === 'photo' || (r.type === 'feedback' && r.image),
    dateStr,
    month,
    weekDates,
    COLORS.photos
  )
  const dayFeedback = list.filter((r) => r.type === 'feedback' && r.date === dateStr)
  const avgRating = dayFeedback.length
    ? Math.round((dayFeedback.reduce((sum, r) => sum + (+r.rating || 0), 0) / dayFeedback.length) * 10) / 10
    : 0
  const configured = trainEntries(trainMap, station)
  const running = new Set(
    list.filter((r) => r.type === 'running' && r.date === dateStr).map((r) => `${r.station}:${r.train}`)
  )
  const run = configured.filter((t) => running.has(`${t.station}:${t.no}`)).length
  const monthRuns = list.filter((r) => r.type === 'running' && r.date.startsWith(month)).length
  const total = feedback.t + attendance.t + photos.t
  const checks = [feedback.t > 0, attendance.t > 0, photos.t > 0, configured.length > 0 && run > 0]
  const latest = list
    .filter((r) => r.type === 'feedback')
    .sort((a, b) => b.at.localeCompare(a.at))[0]
  return {
    feedback,
    attendance,
    inspections,
    photos,
    trains: {
      run,
      total: configured.length,
      month: monthRuns,
      list: configured,
      running,
    },
    total,
    load: feedback.m + attendance.m + photos.m,
    last7: list.filter((r) => r.type !== 'running' && r.date >= from && r.date <= dateStr).length,
    health: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    avgRating,
    latest,
  }
}

export function localAnswer(q, D, city) {
  q = q.toLowerCase()
  const name = stationName(city)
  let a
  if (/feedback/.test(q))
    a = `Feedback on this duty date: ${D.feedback.t}. This month: ${fmt(D.feedback.m)}. Average ${D.feedback.avg}/day. Peak weekday: ${D.feedback.peak}.`
  else if (/attend/.test(q))
    a = `Attendance on this duty date: ${D.attendance.t}. This month: ${fmt(D.attendance.m)}. Average ${D.attendance.avg}/day. Peak weekday: ${D.attendance.peak}.`
  else if (/photo|pic|clean/.test(q))
    a = `Cleanliness photos on this duty date: ${D.photos.t}. This month: ${fmt(D.photos.m)}. Average ${fmt(D.photos.avg)}/day. Peak weekday: ${D.photos.peak}.`
  else if (/train|coverage/.test(q))
    a = D.trains.total
      ? `${D.trains.run} of ${D.trains.total} configured trains are marked running on this duty date. ${D.trains.month} running marks this month.`
      : `No trains are configured for ${name} yet. Add train numbers, then mark the ones running on this duty date.`
  else if (/peak|best|busiest/.test(q))
    a = `Peak weekdays — Feedback: ${D.feedback.peak}, Attendance: ${D.attendance.peak}, Photos: ${D.photos.peak}.`
  else if (/health|system/.test(q))
    a = `Duty health is ${D.health}% from feedback, attendance, photos and train coverage recorded for this date.`
  else if (/total|load|activity|summary|today/.test(q))
    a = `${name} on this duty date: ${D.feedback.t} feedback, ${D.attendance.t} attendance, ${D.photos.t} photos (${fmt(D.total)} records). Month total ${fmt(D.load)}. Last 7 days ${fmt(D.last7)}.`
  else if (/inspect|rake|score/.test(q))
    a = `Rake inspections on this duty date: ${D.inspections?.t || 0}. This month: ${fmt(D.inspections?.m || 0)}.`
  else if (/contact|email|phone/.test(q)) a = 'Robustrix: info@therobustrix.com, 9090020245.'
  else a = 'Ask about feedback, attendance, photos, inspections, trains, peak day, duty health or contact.'
  return `${name}: ${a}`
}

export function alertsFor(records, station, dateStr) {
  const list = records.filter((r) => r.date === dateStr && (station === 'all' || r.station === station))
  const alerts = []
  list
    .filter((r) => r.type === 'feedback' && +r.rating > 0 && +r.rating <= 2)
    .forEach((r) => {
      alerts.push({ level: 'bad', text: `Low rating ${r.rating}/5 on train ${r.train}, coach ${r.coachNo} · ${r.name}` })
    })
  list
    .filter((r) => r.type === 'inspection')
    .forEach((r) => {
      const bad = Object.entries(r.checks || {})
        .filter(([, value]) => value === 'Not OK')
        .map(([name]) => name)
      if (bad.length) alerts.push({ level: 'bad', text: `Rake ${r.train} coach ${r.coach}: ${bad.join(', ')}` })
    })
  list
    .filter((r) => r.type === 'station-clean' && +r.rating > 0 && +r.rating <= 2)
    .forEach((r) => {
      alerts.push({ level: 'bad', text: `Station area ${r.area} rated ${r.rating}/5` })
    })
  const attended = new Set(list.filter((r) => r.type === 'attendance' && r.train).map((r) => String(r.train)))
  list
    .filter((r) => r.type === 'running' && !attended.has(String(r.train)))
    .forEach((r) => {
      alerts.push({ level: 'warn', text: `Train ${r.train} is marked running with no attendance.` })
    })
  return alerts
}

export function scoreCards(records, trainMap, station, dateStr) {
  const day = records.filter((r) => r.date === dateStr && (station === 'all' || r.station === station))
  const trains = new Set(trainEntries(trainMap, station).map((t) => t.no))
  day.forEach((r) => {
    if (r.train) trains.add(String(r.train))
  })
  return [...trains].sort().map((no) => {
    const fb = day.filter((r) => r.type === 'feedback' && String(r.train) === no)
    const ins = day.filter((r) => r.type === 'inspection' && String(r.train) === no)
    const photos = day.filter((r) => r.type === 'photo' && String(r.train) === no).length
    const avg = fb.length
      ? Math.round((fb.reduce((sum, r) => sum + (+r.rating || 0), 0) / fb.length) * 10) / 10
      : null
    let checks = 0
    let pass = 0
    ins.forEach((r) => {
      Object.values(r.checks || {}).forEach((value) => {
        checks += 1
        if (value === 'OK') pass += 1
      })
    })
    const passPct = checks ? Math.round((pass / checks) * 100) : null
    const parts = []
    if (avg != null) parts.push((avg / 5) * 100)
    if (passPct != null) parts.push(passPct)
    const score = parts.length ? Math.round(parts.reduce((sum, n) => sum + n, 0) / parts.length) : null
    return { no, avg, passPct, photos, feedback: fb.length, inspections: ins.length, score }
  })
}
