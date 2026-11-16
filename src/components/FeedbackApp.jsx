import { useEffect, useState } from 'react'
import { formatDate, stationName } from '../data.js'
import { placeNameFromCoords, readLivePlace } from '../geo.js'
import {
  CLEANING_AREAS,
  COACH_TYPES,
  DAY_GRADES,
  DESIGNATIONS,
  DUTY_ROUNDS,
  DUTY_ROUND_LABELS,
  FEEDBACK_COACH_TYPES,
  GRADE_OPTIONS,
  OBHS_FEEDBACK_ITEMS,
  averageGrade,
  blankGrades,
  detailsFromPnr,
  todayDayGrade,
} from '../stations.js'
import BrandLogo, { PoweredBy } from './BrandLogo.jsx'
import { Camera, FeedbackBody } from './Passenger.jsx'
import TrainSelect from './TrainSelect.jsx'
import { addAttendance, addFeedback, addPhoto } from '../store.js'

const EMPTY = {
  name: '',
  train: '',
  coachType: 'AC',
  coachNo: '',
  berth: '',
  quota: 'GN',
  janitorName: '',
  grade: todayDayGrade(),
  areas: ['No issue'],
  grades: blankGrades(),
  rating: '4',
  message: '',
}

function Glyph({ d }) {
  return (
    <span className="obhs-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </span>
  )
}

const ICONS = {
  feedback: 'M4 6h16v10H8l-4 3V6z',
  photo: 'M4 8h3l2-2h6l2 2h3v10H4V8z',
  attendance: 'M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 19c1.2-2.4 3.2-3.5 6-3.5s4.8 1.1 6 3.5',
  rounds: 'M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z',
  summary: 'M8 11a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 8 11zM16 10.2A2 2 0 1 0 16 6a2 2 0 0 0 0 4.2zM4 18c.7-1.8 2.3-2.8 4-2.8s3.3 1 4 2.8M13 15.4c1.3-.2 2.7.4 3.6 1.8',
}

function Shell({ title, sub, children, onBack, notice }) {
  return (
    <section>
      <BrandLogo className="fb-brand" />
      {onBack && <button className="btn ghost" type="button" onClick={onBack}>Back</button>}
      <h2>{title}</h2>
      {sub && <p className="sub">{sub}</p>}
      {notice && <p className="err">{notice}</p>}
      {children}
    </section>
  )
}

function Menu({ title, onOpen, onLogout, notice, flash }) {
  const items = [
    ['feedback', 'Feedback'],
    ['photo', 'Photo Report'],
    ['attendance', 'Attendance'],
    ['rounds', 'Round Wise Summary'],
    ['summary', 'Attendance Summary'],
  ]
  return (
    <section className="fb-home">
      <h1>{title}</h1>
      {flash && <p className="s">{flash}</p>}
      {notice && <p className="err">{notice}</p>}
      <div className="obhs-menu">
        {items.map(([id, label]) => (
          <button key={id} className="card" type="button" onClick={() => onOpen(id)}>
            <Glyph d={ICONS[id]} />
            <span>{label}</span>
            <b aria-hidden="true">›</b>
          </button>
        ))}
      </div>
      <button className="btn logout-btn" type="button" onClick={onLogout}>Log out</button>
      <PoweredBy />
      <p className="legal-links">
        <a href="#privacy">Privacy Policy</a>
        {' · '}
        <a href="#terms">Terms &amp; Conditions</a>
      </p>
    </section>
  )
}

function placeLabel(record) {
  if (record.placeName) return record.placeName
  if (record.lat != null && record.lng != null) return 'Location saved'
  return ''
}

function useLivePlace(setMsg) {
  const [place, setPlace] = useState(null)
  useEffect(() => {
    if (!navigator.geolocation) {
      setMsg?.('This phone cannot share live location.')
      return undefined
    }
    let active = true
    const watch = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = +pos.coords.latitude.toFixed(5)
        const lng = +pos.coords.longitude.toFixed(5)
        const placeName = await placeNameFromCoords(lat, lng)
        if (!active) return
        setPlace({ lat, lng, placeName: placeName || 'Location captured' })
        setMsg?.((current) => (current?.startsWith?.('Allow location') || current?.startsWith?.('This phone') ? '' : current))
      },
      () => setMsg?.((current) => current || 'Allow location so the photo can save where you are.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
    return () => {
      active = false
      navigator.geolocation.clearWatch(watch)
    }
  }, [setMsg])
  return [place, setPlace]
}

function FeedbackFlow({ user, date, station, records, onBack, notice }) {
  const [kind, setKind] = useState('')
  const [step, setStep] = useState(0)
  const [pnr, setPnr] = useState('')
  const [phone, setPhone] = useState('')
  const [form, setForm] = useState(() => ({ ...EMPTY, janitorName: user.name || '', grade: todayDayGrade() }))
  const [pickItem, setPickItem] = useState(null)
  const [msg, setMsg] = useState('')
  const steps = !kind ? ['type'] : kind === 'tte' ? ['type', 'form', 'rate'] : ['type', 'pnr', 'phone', 'form', 'rate']
  const current = steps[step] || 'type'
  const stepTitle =
    current === 'pnr' ? 'Verify PNR Number'
      : current === 'phone' ? 'Mobile number'
        : current === 'form' ? 'Fill Information'
          : current === 'rate' ? 'Please rate the following'
            : 'Feedback'
  const allRated = OBHS_FEEDBACK_ITEMS.every((item) => String(form.grades?.[item.id] ?? '') !== '')

  const go = (next) => {
    setMsg('')
    setStep(next)
  }

  const verifyPnr = () => {
    if (!/^\d{10}$/.test(pnr)) {
      setMsg('PNR must be 10 digits, or skip.')
      return
    }
    const fromPnr = detailsFromPnr(pnr)
    setForm((item) => ({
      ...item,
      coachNo: fromPnr.coachNo,
      berth: fromPnr.berth,
      coachType: fromPnr.coachType,
    }))
    go(step + 1)
  }

  const pickRating = (value) => {
    if (!pickItem) return
    const grades = { ...(form.grades || blankGrades()), [pickItem]: value }
    setForm({ ...form, grades, rating: averageGrade(grades) })
    setPickItem(null)
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!allRated) {
      setMsg('Select a rating for every item.')
      return
    }
    const error = await addFeedback({
      ...form,
      kind,
      phone,
      pnr: kind === 'tte' ? '' : pnr,
      pnrSkipped: kind === 'passenger' && !pnr,
      areas: ['No issue'],
      message: form.message.trim() || 'Rated cleanliness',
      image: '',
      station,
      date,
      by: user.id,
      byName: user.name,
    })
    setMsg(error || 'Saved. Admin can see this feedback on the website.')
    if (!error) {
      setForm({ ...EMPTY, janitorName: user.name || '', grade: todayDayGrade() })
      setPnr('')
      setPhone('')
      setKind('')
      setStep(0)
    }
  }

  return (
    <Shell title={stepTitle} sub={`${formatDate(date)} · ${stationName(station)}`} onBack={onBack} notice={notice}>
      {current === 'type' && (
        <div className="grid">
          <button className="card" type="button" onClick={() => { setKind('passenger'); go(1) }}>
            <div className="k">Feedback</div>
            <h2>Passenger</h2>
            <p>PNR → mobile → Fill Information → rate.</p>
          </button>
          <button
            className="card"
            type="button"
            onClick={() => {
              setKind('tte')
              setForm((item) => ({ ...item, name: item.name || user.name, janitorName: item.janitorName || user.name }))
              go(1)
            }}
          >
            <div className="k">Feedback</div>
            <h2>TTE</h2>
            <p>Fill Information then rate.</p>
          </button>
        </div>
      )}
      {current === 'pnr' && (
        <div className="card flat">
          <label className="field">PNR<input value={pnr} inputMode="numeric" maxLength={10} placeholder="Enter pnr number" onChange={(e) => setPnr(e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
          <p className="empty">After verify, coach number is filled from the PNR.</p>
          <button className="btn" type="button" onClick={verifyPnr}>Verify</button>
          <button className="btn ghost" type="button" onClick={() => { setPnr(''); go(step + 1) }}>Skip</button>
        </div>
      )}
      {current === 'phone' && (
        <div className="card flat">
          <label className="field">Phone<input value={phone} inputMode="tel" maxLength={10} placeholder="Enter mobile number" onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
          <button className="btn" type="button" onClick={() => (phone && !/^\d{10}$/.test(phone) ? setMsg('Mobile must be 10 digits, or skip.') : go(step + 1))}>Continue</button>
          <button className="btn ghost" type="button" onClick={() => { setPhone(''); go(step + 1) }}>Skip</button>
        </div>
      )}
      {current === 'form' && (
        <form
          className="card flat fill-form"
          onSubmit={(e) => {
            e.preventDefault()
            go(step + 1)
          }}
        >
          <p className="k">Fill Information</p>
          <label className="field">
            Coach Type
            <select value={form.coachType} onChange={(e) => setForm({ ...form, coachType: e.target.value })}>
              {FEEDBACK_COACH_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="field">{kind === 'tte' ? 'TTE name' : 'Passenger Name'}<input value={form.name} placeholder="Enter name" onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label className="field">Phone<input value={phone} inputMode="tel" maxLength={10} placeholder="Enter mobile number" onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
          <label className="field">Coach<input value={form.coachNo} placeholder="B1" onChange={(e) => setForm({ ...form, coachNo: e.target.value })} required /></label>
          <TrainSelect station={station} value={form.train} onChange={(train) => setForm({ ...form, train })} required />
          <label className="field">Janitor Name<input value={form.janitorName} placeholder="Janitor name" onChange={(e) => setForm({ ...form, janitorName: e.target.value })} required /></label>
          <label className="field">
            Grade
            <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              {DAY_GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>
          <button className="btn" type="submit">Next</button>
          <button className="btn ghost" type="button" onClick={() => go(step - 1)}>Back</button>
        </form>
      )}
      {current === 'rate' && (
        <div className="rate-screen">
          <h3 className="rate-heading">Please rate the following:</h3>
          <div className="rate-cards">
            {OBHS_FEEDBACK_ITEMS.map((item) => {
              const chosen = GRADE_OPTIONS.find((o) => o.value === String(form.grades?.[item.id]))
              return (
                <article key={item.id} className="rate-card">
                  <p className="rate-en">{item.en}</p>
                  <p className="rate-hi">{item.hi}</p>
                  <div className="rate-card-foot">
                    {chosen && <span className="rate-picked">{chosen.emoji} {chosen.label}</span>}
                    <button className="btn rate-select" type="button" onClick={() => setPickItem(item.id)}>Select</button>
                  </div>
                </article>
              )
            })}
          </div>
          <button className="btn" type="button" onClick={submit} disabled={!allRated}>Submit feedback</button>
          <button className="btn ghost" type="button" onClick={() => go(step - 1)}>Back</button>
          {pickItem && (
            <div className="rate-modal" role="dialog" aria-modal="true" aria-label="Select a Rating">
              <div className="rate-modal-card">
                <h3>Select a Rating</h3>
                <div className="rate-choices">
                  {GRADE_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" className="rate-choice" onClick={() => pickRating(opt.value)}>
                      <span className="rate-emoji" aria-hidden="true">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
                <button className="btn" type="button" onClick={() => setPickItem(null)}>Close</button>
              </div>
            </div>
          )}
        </div>
      )}
      {msg && <p className={msg.startsWith('Saved') ? 's' : 'err'}>{msg}</p>}
    </Shell>
  )
}

function PhotoReport({ user, date, station, onBack, notice, onDone }) {
  const [step, setStep] = useState(0)
  const [photo, setPhoto] = useState({
    image: '', train: '', coachNo: '', coachType: '3A', area: 'Full coach', janitorName: user.name || '', grade: DAY_GRADES[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.id || 'A', note: '',
  })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [place, setPlace] = useLivePlace(setMsg)
  const current = step === 0 ? 'camera' : 'form'

  const onShot = async (image) => {
    setPhoto((item) => ({ ...item, image }))
    setMsg('')
    try {
      setPlace(await readLivePlace())
    } catch (err) {
      setPlace(null)
      setMsg(err.message)
    }
    setStep(1)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return
    if (!photo.image) {
      setMsg('Take a cleaning photo.')
      setStep(0)
      return
    }
    if (place?.lat == null || place?.lng == null) {
      setMsg('Live location is required with the cleaning photo.')
      return
    }
    setSaving(true)
    const error = await addPhoto({
      ...photo,
      lat: place.lat,
      lng: place.lng,
      placeName: place.placeName || '',
      station,
      date,
      by: user.id,
      byName: user.name,
    })
    if (error) {
      setMsg(error)
      setSaving(false)
      return
    }
    setMsg('Submitted successfully')
    setTimeout(() => onDone?.('Submitted successfully'), 700)
  }

  const where = place?.placeName || (place ? 'Finding place name…' : 'Waiting for live location…')

  return (
    <Shell title={current === 'camera' ? 'Photo Report' : 'Photo details'} sub={formatDate(date)} onBack={onBack} notice={notice}>
      {current === 'camera' && (
        <div className="card flat">
          <Camera cameraOnly autoOpen onShot={onShot} onError={setMsg} />
          <p className="facts">{where}</p>
        </div>
      )}
      {current === 'form' && (
        <form className="card flat" onSubmit={submit}>
          {photo.image && <img className="shot" src={photo.image} alt="Cleaning photo" />}
          <label className="field">Coach Number<input value={photo.coachNo} placeholder="B2 or S4" onChange={(e) => setPhoto({ ...photo, coachNo: e.target.value })} required /></label>
          <TrainSelect station={station} value={photo.train} onChange={(train) => setPhoto({ ...photo, train })} required />
          <label className="field">
            Coach Type
            <select value={photo.coachType} onChange={(e) => setPhoto({ ...photo, coachType: e.target.value })}>
              {COACH_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="field">
            Cleaning Area
            <select value={photo.area} onChange={(e) => setPhoto({ ...photo, area: e.target.value })}>
              {CLEANING_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </label>
          <label className="field">Janitor Name<input value={photo.janitorName} onChange={(e) => setPhoto({ ...photo, janitorName: e.target.value })} required /></label>
          <label className="field">
            Grade
            <select value={photo.grade} onChange={(e) => setPhoto({ ...photo, grade: e.target.value })}>
              {DAY_GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>
          <div className="k">Location</div>
          <p className="facts">{where}</p>
          {place?.lat != null && place?.lng != null && (
            <a href={`https://maps.google.com/?q=${place.lat},${place.lng}`} target="_blank" rel="noreferrer">Open on map</a>
          )}
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Save photo'}</button>
          <button className="btn ghost" type="button" onClick={() => setStep(0)} disabled={saving}>Retake photo</button>
        </form>
      )}
      {msg && <p className={msg.startsWith('Submitted') ? 's' : 'err'}>{msg}</p>}
    </Shell>
  )
}

function Attendance({ user, date, station, onBack, notice, onDone }) {
  const todayGrade = DAY_GRADES[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.id || 'A'
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: user.name,
    train: '',
    shift: 'Start',
    coachType: '3A',
    designation: 'Janitor',
    grade: todayGrade,
    image: '',
  })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [place, setPlace] = useLivePlace(setMsg)
  const current = step === 0 ? 'camera' : 'form'

  const onShot = async (image) => {
    setForm((item) => ({ ...item, image }))
    setMsg('')
    try {
      setPlace(await readLivePlace())
    } catch (err) {
      setPlace(null)
      setMsg(err.message)
    }
    setStep(1)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return
    if (!form.image) {
      setMsg('Take a photo.')
      setStep(0)
      return
    }
    if (place?.lat == null || place?.lng == null) {
      setMsg('Live location is required with the photo.')
      return
    }
    setSaving(true)
    const error = await addAttendance({
      ...form,
      lat: place.lat,
      lng: place.lng,
      placeName: place.placeName || '',
      station,
      date,
      by: user.id,
      byName: user.name,
    })
    if (error) {
      setMsg(error)
      setSaving(false)
      return
    }
    setMsg('Submitted successfully')
    setTimeout(() => onDone?.('Submitted successfully'), 700)
  }

  const where = place?.placeName || (place ? 'Finding place name…' : 'Waiting for live location…')

  return (
    <Shell title={current === 'camera' ? 'Attendance photo' : 'Attendance details'} sub={formatDate(date)} onBack={onBack} notice={notice}>
      {current === 'camera' && (
        <div className="card flat">
          <Camera cameraOnly autoOpen onShot={onShot} onError={setMsg} />
          <div className="k" style={{ marginTop: 14 }}>Location</div>
          <p className="facts">{where}</p>
        </div>
      )}
      {current === 'form' && (
        <form className="card flat" onSubmit={submit}>
          {form.image && <img className="shot" src={form.image} alt="Attendance photo" />}
          <label className="field">
            Time of attendance
            <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
              {DUTY_ROUNDS.map((shift) => <option key={shift} value={shift}>{DUTY_ROUND_LABELS[shift] || shift}</option>)}
            </select>
          </label>
          <label className="field">
            Coach Type
            <select value={form.coachType} onChange={(e) => setForm({ ...form, coachType: e.target.value })}>
              {COACH_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="field">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <TrainSelect station={station} value={form.train} onChange={(train) => setForm({ ...form, train })} required />
          <label className="field">
            Grade
            <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              {DAY_GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>
          <label className="field">
            Designation
            <select value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}>
              {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <div className="k">Location</div>
          <p className="facts">{where}</p>
          {place?.lat != null && place?.lng != null && (
            <a href={`https://maps.google.com/?q=${place.lat},${place.lng}`} target="_blank" rel="noreferrer">Open on map</a>
          )}
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Save attendance'}</button>
          <button className="btn ghost" type="button" onClick={() => setStep(0)} disabled={saving}>Retake photo</button>
        </form>
      )}
      {msg && <p className={msg.startsWith('Submitted') ? 's' : 'err'}>{msg}</p>}
    </Shell>
  )
}

function SummaryFilterForm({ date, station, onSubmit }) {
  const [train, setTrain] = useState('')
  const [grade, setGrade] = useState('')
  const [from, setFrom] = useState(date)
  const [to, setTo] = useState(date)
  return (
    <form
      className="card flat summary-filter"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ train: train.trim(), grade, from, to })
      }}
    >
      <TrainSelect station={station} value={train} onChange={setTrain} allowAll placeholder="Select train number" />
      <label className="field">
        Grade
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">Select Grade</option>
          {DAY_GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </label>
      <label className="field">From Date<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></label>
      <label className="field">To Date<input type="date" value={to} onChange={(e) => setTo(e.target.value)} required /></label>
      <button className="btn summary-submit" type="submit">Submit</button>
    </form>
  )
}

function matchSummary(record, filter) {
  if (record.date < filter.from || record.date > filter.to) return false
  if (filter.train && String(record.train || '') !== filter.train) return false
  if (filter.grade && String(record.grade || '').toUpperCase() !== filter.grade.toUpperCase()) return false
  return true
}

function RoundWiseSummary({ date, station, records, onBack, notice }) {
  const [filter, setFilter] = useState(null)
  const rows = filter
    ? records.filter((r) => r.type === 'feedback' && matchSummary(r, filter))
    : []
  return (
    <Shell title="Round Wise Summary" onBack={onBack} notice={notice}>
      <SummaryFilterForm date={date} station={station} onSubmit={setFilter} />
      {filter && (
        <div className="card flat" style={{ marginTop: 14 }}>
          <div className="k">
            {filter.train ? `Train ${filter.train}` : 'All trains'}
            {filter.grade ? ` · Grade ${filter.grade}` : ''}
            {` · ${filter.from} → ${filter.to}`}
            {` · ${rows.length}`}
          </div>
          {rows.length === 0 && <p className="empty">No feedback for this filter.</p>}
          <div className="records">
            {rows.map((record) => (
              <article key={record.id} className="rec public-rec">
                <div><FeedbackBody r={record} /></div>
              </article>
            ))}
          </div>
        </div>
      )}
    </Shell>
  )
}

function AttendanceSummary({ date, station, records, onBack, notice }) {
  const [filter, setFilter] = useState(null)
  const rows = filter
    ? records.filter((r) => r.type === 'attendance' && matchSummary(r, filter))
    : []
  return (
    <Shell title="Attendance Summary" onBack={onBack} notice={notice}>
      <SummaryFilterForm date={date} station={station} onSubmit={setFilter} />
      {filter && (
        <div className="card flat" style={{ marginTop: 14 }}>
          <div className="k">
            {filter.train ? `Train ${filter.train}` : 'All trains'}
            {filter.grade ? ` · Grade ${filter.grade}` : ''}
            {` · ${filter.from} → ${filter.to}`}
            {` · ${rows.length}`}
          </div>
          {rows.length === 0 && <p className="empty">No attendance for this filter.</p>}
          <div className="records">
            {rows.map((record) => (
              <article key={record.id} className="rec public-rec">
                <div>
                  <b>{record.name}</b>
                  <div>
                    {DUTY_ROUND_LABELS[record.shift] || record.shift}
                    {record.designation ? ` · ${record.designation}` : ''}
                    {record.train ? ` · Train ${record.train}` : ''}
                    {record.coachType ? ` · ${record.coachType}` : ''}
                    {record.grade ? ` · Grade ${record.grade}` : ''}
                  </div>
                  {placeLabel(record) && <div>{placeLabel(record)}</div>}
                  {record.image && <img className="shot" src={record.image} alt="" />}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </Shell>
  )
}

export default function FeedbackApp({ user, date, records, onLogout, notice }) {
  const [screen, setScreen] = useState('home')
  const [flash, setFlash] = useState('')
  if (!user?.id) return null
  const station = user.station && user.station !== 'all' ? user.station : ''
  const here = records.filter((record) => record.date === date && (!station || record.station === station))
  const stationRecords = records.filter((record) => !station || record.station === station)
  const title = 'SwachhRail Feedback'

  const goHome = (message = '') => {
    setFlash(message)
    setScreen('home')
  }

  const openScreen = (id) => {
    setFlash('')
    setScreen(id)
  }

  if (!station) {
    return (
      <Shell title="SwachhRail Feedback" notice={notice}>
        <p className="empty">This account has no station, so the feedback app cannot file records.</p>
      </Shell>
    )
  }

  if (screen === 'feedback') return <FeedbackFlow user={user} date={date} station={station} records={here} onBack={() => goHome()} notice={notice} />
  if (screen === 'photo') return <PhotoReport user={user} date={date} station={station} onBack={() => goHome()} notice={notice} onDone={goHome} />
  if (screen === 'attendance') return <Attendance user={user} date={date} station={station} onBack={() => goHome()} notice={notice} onDone={goHome} />
  if (screen === 'rounds') return <RoundWiseSummary date={date} station={station} records={stationRecords} onBack={() => goHome()} notice={notice} />
  if (screen === 'summary') return <AttendanceSummary date={date} station={station} records={stationRecords} onBack={() => goHome()} notice={notice} />
  return <Menu title={title} onOpen={openScreen} onLogout={onLogout} notice={notice} flash={flash} />
}
