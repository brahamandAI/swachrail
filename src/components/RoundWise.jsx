import { useEffect, useMemo, useState } from 'react'
import { formatDate, isoDate, stationName } from '../data.js'
import { DAY_GRADES as BASE_DAY_GRADES } from '../stations.js'
import TrainSelect from './TrainSelect.jsx'

const AC_TYPES = new Set(['1A', '2A', '3A', '3E', 'CC', 'EC'])
const NON_AC_TYPES = new Set(['SL', '2S', 'EV', 'GN'])

export const DAY_GRADES = BASE_DAY_GRADES.map((g, i) => ({
  ...g,
  day: [1, 2, 3, 4, 5, 6, 0][i],
}))

const DEFAULT_TARGET = {
  acCoaches: 8,
  nonAcCoaches: 6,
  acFeedbacks: 16,
  nonAcFeedbacks: 12,
  tteFeedbacks: 4,
}

function targetKey(station) {
  return `swachhrail-feedback-target:${station || 'all'}`
}

export function loadTargets(station) {
  try {
    const raw = JSON.parse(localStorage.getItem(targetKey(station)) || 'null')
    return { ...DEFAULT_TARGET, ...(raw || {}) }
  } catch {
    return { ...DEFAULT_TARGET }
  }
}

export function saveTargets(station, values) {
  localStorage.setItem(targetKey(station), JSON.stringify({ ...DEFAULT_TARGET, ...values }))
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function downloadCsv(filename, rows) {
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function inRange(date, from, to) {
  return date >= from && date <= to
}

function isAc(type) {
  const t = String(type || '').toUpperCase()
  return t === 'AC' || AC_TYPES.has(t)
}

function isNonAc(type) {
  const t = String(type || '').toUpperCase()
  return t === 'NON-AC' || NON_AC_TYPES.has(t)
}

function coachKey(r) {
  return `${String(r.coachType || '').toUpperCase()}|${String(r.coachNo || '').toUpperCase()}`
}

function buildTrainRow(train, feedback, target) {
  const list = feedback.filter((r) => String(r.train) === String(train))
  const passenger = list.filter((r) => r.kind !== 'tte')
  const tte = list.filter((r) => r.kind === 'tte')
  const acFb = passenger.filter((r) => isAc(r.coachType))
  const nonAcFb = passenger.filter((r) => isNonAc(r.coachType) || (!isAc(r.coachType) && r.coachType))
  const acCoaches = new Set(acFb.map(coachKey).filter((k) => !k.endsWith('|')))
  const nonAcCoaches = new Set(nonAcFb.map(coachKey).filter((k) => !k.endsWith('|')))
  const ratings = list.map((r) => +r.rating).filter((n) => n > 0)
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
  const psi = ratings.length ? Math.round((avg / 5) * 10000) / 100 : 0
  const totalFbTarget = target.acFeedbacks + target.nonAcFeedbacks + target.tteFeedbacks
  return {
    train,
    acCoachesTotal: target.acCoaches,
    acCoachesAchieved: Math.min(acCoaches.size, target.acCoaches),
    nonAcCoachesTotal: target.nonAcCoaches,
    nonAcCoachesAchieved: Math.min(nonAcCoaches.size, target.nonAcCoaches),
    acFbTotal: target.acFeedbacks,
    acFbAchieved: Math.min(acFb.length, target.acFeedbacks),
    nonAcFbTotal: target.nonAcFeedbacks,
    nonAcFbAchieved: Math.min(nonAcFb.length, target.nonAcFeedbacks),
    tteFbTotal: target.tteFeedbacks,
    tteFbAchieved: Math.min(tte.length, target.tteFeedbacks),
    totalFbTotal: totalFbTarget,
    totalFbAchieved: Math.min(list.length, totalFbTarget),
    psi,
    feedbackCount: list.length,
  }
}

function sumRows(rows) {
  if (!rows.length) {
    return {
      acCoachesTotal: 0, acCoachesAchieved: 0, nonAcCoachesTotal: 0, nonAcCoachesAchieved: 0,
      acFbTotal: 0, acFbAchieved: 0, nonAcFbTotal: 0, nonAcFbAchieved: 0,
      tteFbTotal: 0, tteFbAchieved: 0, totalFbTotal: 0, totalFbAchieved: 0, psi: 0,
    }
  }
  const sum = rows.reduce((acc, row) => ({
    acCoachesTotal: acc.acCoachesTotal + row.acCoachesTotal,
    acCoachesAchieved: acc.acCoachesAchieved + row.acCoachesAchieved,
    nonAcCoachesTotal: acc.nonAcCoachesTotal + row.nonAcCoachesTotal,
    nonAcCoachesAchieved: acc.nonAcCoachesAchieved + row.nonAcCoachesAchieved,
    acFbTotal: acc.acFbTotal + row.acFbTotal,
    acFbAchieved: acc.acFbAchieved + row.acFbAchieved,
    nonAcFbTotal: acc.nonAcFbTotal + row.nonAcFbTotal,
    nonAcFbAchieved: acc.nonAcFbAchieved + row.nonAcFbAchieved,
    tteFbTotal: acc.tteFbTotal + row.tteFbTotal,
    tteFbAchieved: acc.tteFbAchieved + row.tteFbAchieved,
    totalFbTotal: acc.totalFbTotal + row.totalFbTotal,
    totalFbAchieved: acc.totalFbAchieved + row.totalFbAchieved,
    psiWeight: acc.psiWeight + row.feedbackCount,
    psiSum: acc.psiSum + row.psi * row.feedbackCount,
  }), {
    acCoachesTotal: 0, acCoachesAchieved: 0, nonAcCoachesTotal: 0, nonAcCoachesAchieved: 0,
    acFbTotal: 0, acFbAchieved: 0, nonAcFbTotal: 0, nonAcFbAchieved: 0,
    tteFbTotal: 0, tteFbAchieved: 0, totalFbTotal: 0, totalFbAchieved: 0, psiWeight: 0, psiSum: 0,
  })
  return {
    ...sum,
    psi: sum.psiWeight ? Math.round((sum.psiSum / sum.psiWeight) * 100) / 100 : 0,
  }
}

function excelRows(station, grade, up, down, from, to, rows, total) {
  return [
    ['Round Wise Summary'],
    ['Station', stationName(station)],
    ['UP', up || ''],
    ['Down', down || ''],
    ['From', from],
    ['To', to],
    ['Grade', grade],
    [],
    ['No.', 'Train No.', 'AC Coaches Total', 'AC Coaches Achieved', 'Non AC Coaches Total', 'Non AC Coaches Achieved', 'AC Feedbacks Total', 'AC Feedbacks Achieved', 'Non AC Feedbacks Total', 'Non AC Feedbacks Achieved', 'TTE Feedbacks Total', 'TTE Feedbacks Achieved', 'Total Feedbacks Total', 'Total Feedbacks Achieved', 'Avg. PSI'],
    ...rows.map((row, i) => [
      i + 1, row.train,
      row.acCoachesTotal, row.acCoachesAchieved,
      row.nonAcCoachesTotal, row.nonAcCoachesAchieved,
      row.acFbTotal, row.acFbAchieved,
      row.nonAcFbTotal, row.nonAcFbAchieved,
      row.tteFbTotal, row.tteFbAchieved,
      row.totalFbTotal, row.totalFbAchieved,
      `${row.psi}%`,
    ]),
    [
      'Total', '',
      total.acCoachesTotal, total.acCoachesAchieved,
      total.nonAcCoachesTotal, total.nonAcCoachesAchieved,
      total.acFbTotal, total.acFbAchieved,
      total.nonAcFbTotal, total.nonAcFbAchieved,
      total.tteFbTotal, total.tteFbAchieved,
      total.totalFbTotal, total.totalFbAchieved,
      `${total.psi}%`,
    ],
  ]
}

export function FeedbackTargetPanel({ station }) {
  const [form, setForm] = useState(() => loadTargets(station))
  const [msg, setMsg] = useState('')
  const save = (e) => {
    e.preventDefault()
    const next = {
      acCoaches: Math.max(0, Number(form.acCoaches) || 0),
      nonAcCoaches: Math.max(0, Number(form.nonAcCoaches) || 0),
      acFeedbacks: Math.max(0, Number(form.acFeedbacks) || 0),
      nonAcFeedbacks: Math.max(0, Number(form.nonAcFeedbacks) || 0),
      tteFeedbacks: Math.max(0, Number(form.tteFeedbacks) || 0),
    }
    saveTargets(station, next)
    setForm(next)
    setMsg('Feedback target saved for this station.')
  }
  return (
    <section>
      <h2>Feedback Target</h2>
      <p className="sub">{stationName(station)} · used as Total values in Round Wise Summary</p>
      <form className="card flat" onSubmit={save} style={{ maxWidth: 520 }}>
        <label className="field">AC coaches target<input type="number" min="0" value={form.acCoaches} onChange={(e) => setForm({ ...form, acCoaches: e.target.value })} /></label>
        <label className="field">Non AC coaches target<input type="number" min="0" value={form.nonAcCoaches} onChange={(e) => setForm({ ...form, nonAcCoaches: e.target.value })} /></label>
        <label className="field">AC feedbacks target<input type="number" min="0" value={form.acFeedbacks} onChange={(e) => setForm({ ...form, acFeedbacks: e.target.value })} /></label>
        <label className="field">Non AC feedbacks target<input type="number" min="0" value={form.nonAcFeedbacks} onChange={(e) => setForm({ ...form, nonAcFeedbacks: e.target.value })} /></label>
        <label className="field">TTE feedbacks target<input type="number" min="0" value={form.tteFeedbacks} onChange={(e) => setForm({ ...form, tteFeedbacks: e.target.value })} /></label>
        <button className="btn" type="submit">Save target</button>
        {msg && <p className="s">{msg}</p>}
      </form>
    </section>
  )
}

export function ViewFeedbackTarget({ station }) {
  const t = loadTargets(station)
  return (
    <section>
      <h2>View Feedback Target</h2>
      <p className="sub">{stationName(station)}</p>
      <div className="card flat">
        <table className="score-table round-table">
          <tbody>
            <tr><td>AC coaches</td><td><b>{t.acCoaches}</b></td></tr>
            <tr><td>Non AC coaches</td><td><b>{t.nonAcCoaches}</b></td></tr>
            <tr><td>AC feedbacks</td><td><b>{t.acFeedbacks}</b></td></tr>
            <tr><td>Non AC feedbacks</td><td><b>{t.nonAcFeedbacks}</b></td></tr>
            <tr><td>TTE feedbacks</td><td><b>{t.tteFeedbacks}</b></td></tr>
            <tr><td>Total feedbacks</td><td><b>{t.acFeedbacks + t.nonAcFeedbacks + t.tteFeedbacks}</b></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function RoundWise({ records, trains, station, date, compact = false }) {
  const trainList = useMemo(() => {
    const configured = station && station !== 'all' ? (trains?.[station] || []) : Object.values(trains || {}).flat()
    const fromRecords = records
      .filter((r) => r.train && (station === 'all' || !station || r.station === station))
      .map((r) => String(r.train))
    return [...new Set([...configured.map(String), ...fromRecords])].sort()
  }, [records, trains, station])

  const [grade, setGrade] = useState('D')
  const [up, setUp] = useState('')
  const [down, setDown] = useState('')
  const [from, setFrom] = useState(date || isoDate())
  const [to, setTo] = useState(date || isoDate())
  const [applied, setApplied] = useState({ grade: 'D', up: '', down: '', from: date || isoDate(), to: date || isoDate() })

  useEffect(() => {
    if (!up && trainList[0]) setUp(trainList[0])
    if (!down && (trainList[1] || trainList[0])) setDown(trainList[1] || trainList[0] || '')
  }, [trainList, up, down])

  const target = loadTargets(station)
  const selectedTrains = [applied.up, applied.down].filter(Boolean).filter((t, i, arr) => arr.indexOf(t) === i)

  const feedback = records.filter((r) => (
    r.type === 'feedback'
    && inRange(r.date, applied.from, applied.to)
    && (station === 'all' || !station || r.station === station)
    && (!selectedTrains.length || selectedTrains.includes(String(r.train)))
  ))

  const rows = selectedTrains.length
    ? selectedTrains.map((train) => buildTrainRow(train, feedback, target))
    : [...new Set(feedback.map((r) => String(r.train)).filter(Boolean))].sort().map((train) => buildTrainRow(train, feedback, target))

  const total = sumRows(rows)
  const gradeMeta = DAY_GRADES.find((g) => g.id === applied.grade)

  const submit = (e) => {
    e.preventDefault()
    setApplied({ grade, up, down, from, to })
  }

  const exportExcel = () => {
    downloadCsv(
      `round-wise-summary-${applied.from}-to-${applied.to}.csv`,
      excelRows(station, applied.grade, applied.up, applied.down, applied.from, applied.to, rows, total)
    )
  }

  const exportAllExcel = () => {
    downloadCsv(
      `all-reports-round-wise-${applied.from}-to-${applied.to}.csv`,
      [
        ...excelRows(station, applied.grade, applied.up, applied.down, applied.from, applied.to, rows, total),
        [],
        ['Feedback detail'],
        ['Date', 'Kind', 'Name', 'Train', 'Coach type', 'Coach', 'Rating', 'Comment'],
        ...feedback.map((r) => [r.date, r.kind === 'tte' ? 'TTE' : 'Passenger', r.name, r.train, r.coachType, r.coachNo, r.rating, r.message]),
      ]
    )
  }

  return (
    <section className={compact ? 'round-wise compact beatle-round' : 'round-wise beatle-round'}>
      {!compact && <h2>Round Wise Summary</h2>}

      <form className="round-filters" onSubmit={submit}>
        <label className="field">
          Grade
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            {DAY_GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
        <TrainSelect station={station} value={up} onChange={setUp} label="UP" extra={trainList} placeholder="Select UP train" />
        <TrainSelect station={station} value={down} onChange={setDown} label="Down" extra={trainList} placeholder="Select Down train" />
        <label className="field">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></label>
        <label className="field">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} required /></label>
        <button className="btn round-submit" type="submit">Submit</button>
      </form>

      <div className="report-actions round-downloads">
        <button className="btn ghost" type="button" onClick={() => window.print()}>Print</button>
        <button className="btn ghost" type="button" onClick={exportExcel}>Export to Excel</button>
        <button className="btn ghost" type="button" onClick={() => window.print()}>All Reports PDF</button>
        <button className="btn ghost" type="button" onClick={exportAllExcel}>All Reports Excel</button>
      </div>

      <div className="round-banner">
        Station: {stationName(station)} | UP: {applied.up || '—'} | Down: {applied.down || '—'} | From: {applied.from} | To: {applied.to} | Grade: {applied.grade}{gradeMeta ? ` (${gradeMeta.label.split(' - ')[1]})` : ''}
      </div>

      <div className="table-wrap beatle-table-wrap">
        <table className="beatle-round-table">
          <thead>
            <tr>
              <th rowSpan={2}>No.</th>
              <th rowSpan={2}>Train No.</th>
              <th colSpan={2}>AC Coaches</th>
              <th colSpan={2}>Non AC Coaches</th>
              <th colSpan={2}>AC Feedbacks</th>
              <th colSpan={2}>Non AC Feedbacks</th>
              <th colSpan={2}>TTE Feedbacks</th>
              <th colSpan={2}>Total Feedbacks</th>
              <th rowSpan={2}>Avg. PSI</th>
            </tr>
            <tr>
              <th>Total</th><th>Achieved</th>
              <th>Total</th><th>Achieved</th>
              <th>Total</th><th>Achieved</th>
              <th>Total</th><th>Achieved</th>
              <th>Total</th><th>Achieved</th>
              <th>Total</th><th>Achieved</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={15}>No feedback in this range. Choose UP/Down trains, dates, then Submit.</td></tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.train}>
                <td>{i + 1}</td>
                <td>{row.train}</td>
                <td>{row.acCoachesTotal}</td><td>{row.acCoachesAchieved}</td>
                <td>{row.nonAcCoachesTotal}</td><td>{row.nonAcCoachesAchieved}</td>
                <td>{row.acFbTotal}</td><td>{row.acFbAchieved}</td>
                <td>{row.nonAcFbTotal}</td><td>{row.nonAcFbAchieved}</td>
                <td>{row.tteFbTotal}</td><td>{row.tteFbAchieved}</td>
                <td>{row.totalFbTotal}</td><td>{row.totalFbAchieved}</td>
                <td>{row.psi}%</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="total-row">
                <td colSpan={2}><b>Total</b></td>
                <td>{total.acCoachesTotal}</td><td>{total.acCoachesAchieved}</td>
                <td>{total.nonAcCoachesTotal}</td><td>{total.nonAcCoachesAchieved}</td>
                <td>{total.acFbTotal}</td><td>{total.acFbAchieved}</td>
                <td>{total.nonAcFbTotal}</td><td>{total.nonAcFbAchieved}</td>
                <td>{total.tteFbTotal}</td><td>{total.tteFbAchieved}</td>
                <td>{total.totalFbTotal}</td><td>{total.totalFbAchieved}</td>
                <td><b>{total.psi}%</b></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="empty" style={{ marginTop: 8 }}>
        Total / Achieved · targets from Feedback Target · date range {formatDate(applied.from)} to {formatDate(applied.to)}
      </p>
    </section>
  )
}
