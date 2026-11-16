import { useEffect, useRef, useState } from 'react'
import { formatDate, isoDate, stationName } from '../data.js'
import { maskPhone, maskPnr, readPhoto } from '../photo.js'
import { COACH_TYPES, GRADE_ITEMS, GRADE_OPTIONS, OBHS_FEEDBACK_ITEMS, PROBLEM_AREAS, QUOTAS, averageGrade, blankGrades } from '../stations.js'
import StationPicker from './StationPicker.jsx'
import TrainSelect from './TrainSelect.jsx'
import { addFeedback } from '../store.js'

const EMPTY = {
  name: '', phone: '', pnr: '', train: '', coachType: '3A', coachNo: '', berth: '', quota: 'GN', areas: [], grades: blankGrades(), rating: '5', message: '', image: '',
}

function toggleArea(current, area) {
  if (area === 'No issue') return current.includes('No issue') ? [] : ['No issue']
  const next = current.filter((item) => item !== 'No issue')
  return next.includes(area) ? next.filter((item) => item !== area) : [...next, area]
}

export function FeedbackBody({ r, mask = false }) {
  const facts = [
    r.kind === 'tte' ? 'TTE' : r.kind ? 'Passenger' : '',
    r.pnr ? `PNR ${mask ? maskPnr(r.pnr) : r.pnr}` : '',
    r.train ? `Train ${r.train}` : '',
    r.coachType || '',
    r.coachNo ? `Coach ${r.coachNo}` : '',
    r.berth ? `Berth ${r.berth}` : '',
    r.quota ? `Quota ${r.quota}` : '',
    r.janitorName ? `Janitor ${r.janitorName}` : '',
    r.grade ? `Grade ${r.grade}` : '',
  ].filter(Boolean)
  const gradeKeys = Object.keys(r.grades || {})
  const obhs = OBHS_FEEDBACK_ITEMS.filter((item) => gradeKeys.includes(item.id))
  const legacy = GRADE_ITEMS.filter((item) => gradeKeys.includes(item) && !obhs.some((o) => o.id === item))
  return (
    <>
      <b>{r.name}</b> · {GRADE_OPTIONS.find((o) => o.value === String(r.rating))?.label || `★${r.rating || ''}`}
      <div>{r.message}</div>
      {facts.length > 0 && <div className="facts">{facts.join(' · ')}</div>}
      {r.areas?.length > 0 && r.areas.join(',') !== 'No issue' && <div>Problem area: {r.areas.join(', ')}</div>}
      {obhs.length > 0 && (
        <div className="facts">
          {obhs.map((item) => {
            const opt = GRADE_OPTIONS.find((o) => o.value === String(r.grades[item.id]))
            return `${item.id}: ${opt?.label || r.grades[item.id]}`
          }).join(' · ')}
        </div>
      )}
      {legacy.length > 0 && (
        <div className="facts">
          Grading: {legacy.map((item) => `${item} ${GRADE_OPTIONS.find((o) => o.value === String(r.grades[item]))?.label || r.grades[item]}`).join(' · ')}
        </div>
      )}
      {r.image && <img className="shot" src={r.image} alt="" />}
    </>
  )
}

export function FeedbackFields({ form, setForm, hidePnr = false, hidePhone = false, nameLabel = 'Your name', coachTypes = COACH_TYPES, withGrading = true, station = '' }) {
  const setGrade = (item, value) => {
    const grades = { ...(form.grades || blankGrades()), [item]: value }
    setForm({ ...form, grades, rating: averageGrade(grades) })
  }
  return (
    <>
      <label className="field">{nameLabel}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
      {!hidePhone && <label className="field">Phone<input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>}
      {!hidePnr && <label className="field">PNR<input value={form.pnr} inputMode="numeric" maxLength={10} placeholder="10 digit PNR" onChange={(e) => setForm({ ...form, pnr: e.target.value.replace(/\D/g, '').slice(0, 10) })} required /></label>}
      <TrainSelect station={station} value={form.train} onChange={(train) => setForm({ ...form, train })} required />
      <label className="field">
        Coach type
        <select value={form.coachType} onChange={(e) => setForm({ ...form, coachType: e.target.value })}>
          {coachTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </label>
      <label className="field">Coach number<input value={form.coachNo} placeholder="B2 or S4" onChange={(e) => setForm({ ...form, coachNo: e.target.value })} required /></label>
      <label className="field">Berth / seat<input value={form.berth} placeholder="Optional" onChange={(e) => setForm({ ...form, berth: e.target.value })} /></label>
      <label className="field">
        Quota
        <select value={form.quota || 'GN'} onChange={(e) => setForm({ ...form, quota: e.target.value })}>
          {QUOTAS.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </label>
      <div className="field">
        Problem area
        <div className="areas">
          {PROBLEM_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              className={form.areas.includes(area) ? 'chip on' : 'chip'}
              onClick={() => setForm({ ...form, areas: toggleArea(form.areas, area) })}
            >
              {area}
            </button>
          ))}
        </div>
      </div>
      {withGrading && (
        <div className="field grade-block">
          Please rate the following
          <div className="grade-list">
            {OBHS_FEEDBACK_ITEMS.map((item) => (
              <label className="check-row" key={item.id}>
                <span>{item.en}</span>
                <select value={(form.grades || blankGrades())[item.id] || ''} onChange={(e) => setGrade(item.id, e.target.value)} required>
                  <option value="" disabled>Select</option>
                  {GRADE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.emoji ? `${opt.emoji} ` : ''}{opt.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="facts">Overall: {GRADE_OPTIONS.find((o) => o.value === String(form.rating))?.label || '—'}</p>
        </div>
      )}
      {!withGrading && (
        <label className="field">
          Cleanliness
          <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
            {GRADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      )}
      <label className="field">Comment<textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></label>
    </>
  )
}

export function Camera({ onShot, onError, cameraOnly = false, autoOpen = false }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fallbackRef = useRef(null)
  const openedRef = useRef(false)
  const [live, setLive] = useState(false)
  const [busy, setBusy] = useState(false)

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setLive(false)
  }

  useEffect(() => () => stop(), [])

  useEffect(() => {
    if (live && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [live])

  const open = async () => {
    onError('')
    setBusy(true)
    if (!navigator.mediaDevices?.getUserMedia) {
      setBusy(false)
      fallbackRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      setLive(true)
    } catch {
      onError(cameraOnly ? 'Camera permission was blocked. Allow the camera and try again.' : 'Camera permission was blocked. Allow the camera, or use the phone camera capture.')
      fallbackRef.current?.click()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!autoOpen || openedRef.current) return undefined
    openedRef.current = true
    const timer = setTimeout(() => { open() }, 80)
    return () => clearTimeout(timer)
  }, [autoOpen])

  const snap = () => {
    const video = videoRef.current
    if (!video?.videoWidth) return
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    onShot(canvas.toDataURL('image/jpeg', 0.72))
    stop()
  }

  const fromFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      onShot(await readPhoto(file))
    } catch (err) {
      onError(err.message)
    }
  }

  return (
    <div className="camera">
      {live && (
        <div className="view">
          <video ref={videoRef} autoPlay playsInline muted />
          <div className="row">
            <button className="btn" type="button" onClick={snap}>Capture</button>
            <button className="btn ghost" type="button" onClick={stop}>Close camera</button>
          </div>
        </div>
      )}
      {!live && (
        <div className="row">
          {busy ? (
            <p className="facts">Opening camera…</p>
          ) : autoOpen ? (
            <p className="facts">Starting camera…</p>
          ) : (
            <button className="btn" type="button" onClick={open}>Open camera</button>
          )}
        </div>
      )}
      <input ref={fallbackRef} type="file" accept="image/*" capture="environment" hidden onChange={fromFile} />
    </div>
  )
}

export default function Passenger({ records, station, onStation, date, onDate, listOnly = false }) {
  const [form, setForm] = useState(EMPTY)
  const [msg, setMsg] = useState('')
  const rows = records.filter(
    (r) => r.type === 'feedback' && r.date === date && (station === 'all' || r.station === station)
  )

  const submit = async (e) => {
    e.preventDefault()
    const today = isoDate()
    if (!station || station === 'all') {
      setMsg('Choose your station.')
      return
    }
    const error = await addFeedback({
      ...form,
      station,
      date: today,
      by: 'passenger',
      byName: form.name.trim(),
    })
    setMsg(error || 'Thank you. Your feedback is now on the board.')
    if (!error) {
      setForm(EMPTY)
      onDate(today)
    }
  }

  return (
    <section id="fb">
      <h2>Passenger feedback</h2>
      <p className="sub">Tell us about cleanliness on {formatDate(date)}. Grade each area and leave a short comment.</p>
      <div className="two">
        {listOnly ? (
          <div className="card flat">
            <div className="k">Give feedback</div>
            <p>Passenger and TTE feedback is in the SwachhRail Feedback app.</p>
            <a className="btn" href="#feedback">Open feedback</a>
          </div>
        ) : (
        <form className="card flat" onSubmit={submit}>
          <StationPicker value={station === 'all' ? '' : station} onChange={onStation} />
          <FeedbackFields form={form} setForm={setForm} station={station === 'all' ? '' : station} />
          <button className="btn" type="submit">Submit feedback</button>
          {msg && <div className={msg.startsWith('Thank') ? 's' : 'err'}>{msg}</div>}
        </form>
        )}

        <div className="card flat">
          <div className="k">Feedback on this date · {rows.length}</div>
          {rows.length === 0 && <p className="empty">No passenger feedback for {formatDate(date)} yet.</p>}
          <div className="records">
            {rows.map((r) => (
              <article key={r.id} className="rec public-rec">
                <div>
                  <FeedbackBody r={r} mask />
                  <small>
                    {stationName(r.station)}
                    {maskPhone(r.phone) ? ` · ${maskPhone(r.phone)}` : ''}
                    {' · '}
                    {new Date(r.at).toLocaleString('en-IN')}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
