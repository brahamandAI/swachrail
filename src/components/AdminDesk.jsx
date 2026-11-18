import { useMemo, useState } from 'react'
import { formatDate, isoDate, stationName } from '../data.js'
import { updateAccess, useDB } from '../store.js'
import Dashboard from './Dashboard.jsx'
import { StaffDesk } from './Operations.jsx'
import AIAssistant from './AIAssistant.jsx'
import BrandLogo from './BrandLogo.jsx'
import RoundWise, { FeedbackTargetPanel, ViewFeedbackTarget } from './RoundWise.jsx'
import { DAY_GRADES, DUTY_ROUND_LABELS } from '../stations.js'
import TrainSelect from './TrainSelect.jsx'

const NAV = [
  { id: 'dash', label: 'Dashboard', icon: 'M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z' },
  { id: 'rounds', label: 'Round Wise Summary', icon: 'M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9zM12 8v4l3 2' },
  { id: 'photos', label: 'Photo Report Coach Wise', icon: 'M4 7h16v11H4zM9 7l1.2-2.5h3.6L15 7' },
  { id: 'attendance', label: 'Attendance Photo Report', icon: 'M12 12a3.2 3.2 0 1 0-3.2-3.2A3.2 3.2 0 0 0 12 12zM5 20a7 7 0 0 1 14 0' },
  { id: 'feedback-target', label: 'Feedback Target', admin: true, icon: 'M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9zM12 12.8a.8.8 0 1 0-.8-.8.8.8 0 0 0 .8.8z' },
  { id: 'view-feedback-target', label: 'View Feedback Target', admin: true, icon: 'M12 3l9 9-9 9-9-9z' },
  { id: 'create-emp', label: 'Create Employee', admin: true, icon: 'M12 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM6 19a6 6 0 0 1 12 0' },
  { id: 'view-emp', label: 'View Employee', admin: true, icon: 'M9 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm8 .5a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 17 11.5zM3 19a5.5 5.5 0 0 1 11 0M14 19a4.5 4.5 0 0 1 7 0' },
  { id: 'attendance-report', label: 'Attendance Report', icon: 'M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9zM9 8v8M12 10v6M15 7v9' },
  { id: 'password', label: 'Change Dashboard Password', icon: 'M8 11V8a4 4 0 0 1 8 0v3M7 11h10v9H7zM12 15v2', accent: '#5eead4' },
  { id: 'app-password', label: 'Change App Password', admin: true, icon: 'M8 11V8a4 4 0 0 1 8 0v3M7 11h10v9H7zM12 14.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z', accent: '#38bdf8' },
]

function NavIcon({ d, accent }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={accent || 'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

function sameStation(record, station) {
  return station === 'all' || record.station === station
}

function AdminQueryForm({ station, date, onApply, submitLabel = 'Submit' }) {
  const [grade, setGrade] = useState('')
  const [train, setTrain] = useState('')
  const [from, setFrom] = useState(date || isoDate())
  const [to, setTo] = useState(date || isoDate())
  return (
    <form
      className="admin-query"
      onSubmit={(e) => {
        e.preventDefault()
        onApply({ grade, train: train.trim(), from, to })
      }}
    >
      <label className="field">
        Grade
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">All Grades</option>
          {DAY_GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </label>
      <TrainSelect station={station} value={train} onChange={setTrain} allowAll placeholder="Select train number" />
      <label className="field">From Date<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></label>
      <label className="field">To Date<input type="date" value={to} onChange={(e) => setTo(e.target.value)} required /></label>
      <button className="btn admin-query-submit" type="submit">{submitLabel}</button>
    </form>
  )
}

function matchQuery(record, filter) {
  if (!filter) return false
  if (record.date < filter.from || record.date > filter.to) return false
  if (filter.up || filter.down) {
    const trains = [filter.up, filter.down].filter(Boolean).map(String)
    if (!trains.includes(String(record.train || ''))) return false
  } else if (filter.train && String(record.train || '') !== filter.train) {
    return false
  }
  if (filter.grade && String(record.grade || '').toUpperCase() !== filter.grade.toUpperCase()) return false
  return true
}

function QueryBanner({ station, filter }) {
  if (!filter) return null
  const gradeMeta = DAY_GRADES.find((g) => g.id === filter.grade)
  const trainLabel = (filter.up || filter.down)
    ? `UP: ${filter.up || '—'} | Down: ${filter.down || '—'}`
    : `Train: ${filter.train || 'All'}`
  return (
    <div className="round-banner">
      Station: {stationName(station)}
      {' | '}{trainLabel}
      {' | '}From: {filter.from}
      {' | '}To: {filter.to}
      {' | '}Grade: {filter.grade || 'All'}{gradeMeta ? ` (${gradeMeta.label.split(' - ')[1]})` : ''}
    </div>
  )
}

function AttendanceQueryForm({ station, date, onApply }) {
  const [grade, setGrade] = useState('')
  const [up, setUp] = useState('')
  const [down, setDown] = useState('')
  const [from, setFrom] = useState(date || isoDate())
  const [to, setTo] = useState(date || isoDate())
  return (
    <form
      className="admin-query"
      onSubmit={(e) => {
        e.preventDefault()
        onApply({ grade, up: up.trim(), down: down.trim(), from, to })
      }}
    >
      <label className="field">
        Grade
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">All Grades</option>
          {DAY_GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </label>
      <TrainSelect station={station} value={up} onChange={setUp} label="UP" allowAll placeholder="Select UP train" />
      <TrainSelect station={station} value={down} onChange={setDown} label="Down" allowAll placeholder="Select Down train" />
      <label className="field">From Date<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></label>
      <label className="field">To Date<input type="date" value={to} onChange={(e) => setTo(e.target.value)} required /></label>
      <button className="btn admin-query-submit" type="submit">Search</button>
    </form>
  )
}

function PhotoReportPanel({ records, trains, station, date }) {
  const [filter, setFilter] = useState(null)
  const rows = filter
    ? records.filter((r) => r.type === 'photo' && sameStation(r, station) && matchQuery(r, filter))
    : []
  const groups = new Map()
  rows.forEach((r) => {
    const key = r.coachNo || r.area || 'Coach not set'
    groups.set(key, [...(groups.get(key) || []), r])
  })
  return (
    <section>
      <h2>Photo Report Coach Wise</h2>
      <p className="sub">Filter by grade, train number and date range.</p>
      <AdminQueryForm station={station} date={date} onApply={setFilter} />
      <QueryBanner station={station} filter={filter} />
      {!filter && <p className="empty">Choose Grade / Train / dates, then Submit.</p>}
      {filter && rows.length === 0 && <p className="empty">No photo reports for this filter.</p>}
      {[...groups.entries()].map(([coach, list]) => (
        <div className="card flat" key={coach} style={{ marginTop: 14 }}>
          <div className="k">{coach} · {list.length}</div>
          {list.map((r) => (
            <article key={r.id} className="rec">
              <b>Train {r.train || '—'}{r.coachType ? ` · ${r.coachType}` : ''}{r.grade ? ` · Grade ${r.grade}` : ''}</b>
              <div>
                {r.janitorName ? `Janitor ${r.janitorName}` : ''}{r.area ? ` · ${r.area}` : ''}
                <div>{r.note}</div>
                <div className="pair">
                  {(r.before || r.image) && <img className="shot" src={r.before || r.image} alt="Photo" />}
                  {r.after && <img className="shot" src={r.after} alt="After" />}
                </div>
                <small>{r.byName}{r.placeName ? ` · ${r.placeName}` : ''} · {r.date}</small>
              </div>
            </article>
          ))}
        </div>
      ))}
    </section>
  )
}

function AttendancePanel({ records, station, date, title, withPhotos = true }) {
  const [filter, setFilter] = useState(null)
  const rows = filter
    ? records.filter((r) => r.type === 'attendance' && sameStation(r, station) && matchQuery(r, filter))
    : []
  const upTrain = filter?.up || ''
  const downTrain = filter?.down || ''
  const people = [...new Set(rows.map((r) => r.name || r.byName || 'Staff').filter(Boolean))]
  const cell = (name, train, shift) => rows.find((r) => (r.name || r.byName) === name && String(r.train || '') === String(train) && r.shift === shift)

  return (
    <section>
      <h2>{title}</h2>
      <p className="sub">Filter by grade, UP train, Down train and date range.</p>
      <AttendanceQueryForm station={station} date={date} onApply={setFilter} />
      <QueryBanner station={station} filter={filter} />
      <div className="card flat" style={{ marginTop: 14 }}>
        {!filter && <p className="empty">Choose Grade / UP / Down / dates, then Search.</p>}
        {filter && rows.length === 0 && <p className="empty">No attendance for this filter.</p>}
        {filter && rows.length > 0 && (upTrain || downTrain) && (
          <div className="table-wrap beatle-table-wrap">
            <table className="beatle-round-table attend-updown-table">
              <thead>
                <tr>
                  <th rowSpan={2}>Employee</th>
                  {upTrain && <th colSpan={3}>UP · {upTrain}</th>}
                  {downTrain && <th colSpan={3}>Down · {downTrain}</th>}
                </tr>
                <tr>
                  {upTrain && DUTY_ROUNDS.map((shift) => <th key={`up-${shift}`}>{DUTY_ROUND_LABELS[shift] || shift}</th>)}
                  {downTrain && DUTY_ROUNDS.map((shift) => <th key={`dn-${shift}`}>{DUTY_ROUND_LABELS[shift] || shift}</th>)}
                </tr>
              </thead>
              <tbody>
                {people.map((name) => (
                  <tr key={name}>
                    <td><b>{name}</b></td>
                    {upTrain && DUTY_ROUNDS.map((shift) => {
                      const hit = cell(name, upTrain, shift)
                      return (
                        <td key={`${name}-up-${shift}`}>
                          {hit ? (withPhotos && hit.image ? <img className="shot attend-thumb" src={hit.image} alt="" /> : '✓') : '—'}
                        </td>
                      )
                    })}
                    {downTrain && DUTY_ROUNDS.map((shift) => {
                      const hit = cell(name, downTrain, shift)
                      return (
                        <td key={`${name}-dn-${shift}`}>
                          {hit ? (withPhotos && hit.image ? <img className="shot attend-thumb" src={hit.image} alt="" /> : '✓') : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filter && rows.length > 0 && !(upTrain || downTrain) && (
          <div className="records">
            {rows.map((r) => (
              <article key={r.id} className="rec">
                <b>{DUTY_ROUND_LABELS[r.shift] || r.shift || '—'}</b>
                <div>
                  {r.name}
                  {r.designation ? ` · ${r.designation}` : ''}
                  {` · Train ${r.train || '—'}`}
                  {r.coachType ? ` · ${r.coachType}` : ''}
                  {r.grade ? ` · Grade ${r.grade}` : ''}
                  {(r.placeName || (r.lat != null && r.lng != null)) && (
                    <div>
                      {r.lat != null && r.lng != null ? (
                        <a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">{r.placeName || 'Open on map'}</a>
                      ) : r.placeName}
                    </div>
                  )}
                  {withPhotos && r.image && <img className="shot" src={r.image} alt="" />}
                  <small>{r.byName} · {r.date}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function PasswordPanel({ user }) {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const save = async (event) => {
    event.preventDefault()
    const error = await updateAccess({
      id: user.id,
      name: user.name,
      username: user.username,
      station: user.station,
      password,
    })
    setMsg(error || 'Saved. Use the new password next time.')
    if (!error) setPassword('')
  }
  return (
    <section>
      <h2>Change Dashboard Password</h2>
      <form className="card" onSubmit={save} style={{ maxWidth: 420 }}>
        <label className="field">Username<input value={user.username} disabled /></label>
        <label className="field">New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete="new-password" /></label>
        <button className="btn" type="submit">Update password</button>
        {msg && <p className={msg.startsWith('Saved') ? 's' : 'err'}>{msg}</p>}
      </form>
    </section>
  )
}

function AppPasswordPanel({ users, station }) {
  const staff = users.filter((u) => u.role === 'user' && (station === 'all' || u.station === station))
  const [id, setId] = useState(staff[0]?.id || '')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const selected = staff.find((u) => u.id === id) || staff[0]
  const save = async (event) => {
    event.preventDefault()
    if (!selected) {
      setMsg('Create an employee first.')
      return
    }
    const error = await updateAccess({
      id: selected.id,
      name: selected.name,
      username: selected.username,
      station: selected.station,
      password,
    })
    setMsg(error || `App password updated for ${selected.name}.`)
    if (!error) setPassword('')
  }
  return (
    <section>
      <h2>Change App Password</h2>
      <p className="sub">Password for SwachhRail Feedback app staff login.</p>
      <form className="card" onSubmit={save} style={{ maxWidth: 420 }}>
        <label className="field">
          Employee
          <select value={selected?.id || ''} onChange={(e) => setId(e.target.value)}>
            {staff.length === 0 && <option value="">No employees</option>}
            {staff.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.username}</option>)}
          </select>
        </label>
        <label className="field">New app password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete="new-password" /></label>
        <button className="btn" type="submit">Update app password</button>
        {msg && <p className={msg.startsWith('App') || msg.startsWith('Saved') ? 's' : 'err'}>{msg}</p>}
      </form>
    </section>
  )
}

function SideStatus({ stats, date }) {
  return (
    <aside className="admin-rail">
      <div className="card flat rail-card">
        <div className="k">{formatDate(date)}</div>
        <div className="ring" style={{ background: `conic-gradient(var(--c) ${stats.health}%, #ffffff14 0)`, margin: '14px auto' }}>
          <b>{stats.health}%</b>
        </div>
        <p className="s" style={{ textAlign: 'center' }}>Duty health</p>
      </div>
      <div className="card flat rail-card">
        <div className="k">Live status</div>
        <ul className="rail-list">
          <li>Feedback today <b>{stats.feedback.t}</b></li>
          <li>Avg grade <b>{stats.avgRating ? stats.avgRating.toFixed(1) : '—'}</b></li>
          <li>Photo upload <b>{stats.photos.t}</b></li>
          <li>Attendance sync <b>{stats.attendance.t}</b></li>
          <li>Trains running <b>{stats.trains.run}/{stats.trains.total}</b></li>
          <li>Month load <b>{stats.load}</b></li>
        </ul>
      </div>
    </aside>
  )
}

export default function AdminDesk({ user, date, station, onStation, stats, notice, onLogout }) {
  const db = useDB()
  const [panel, setPanel] = useState('dash')
  const [menuOpen, setMenuOpen] = useState(false)
  const fileStation = station !== 'all' ? station : user.station
  const items = NAV.filter((item) => !item.admin || user.role === 'admin')
  const latest = useMemo(
    () => db.records.filter((r) => r.type === 'feedback' && sameStation(r, station)).slice(0, 8),
    [db.records, station]
  )
  const openPanel = (id) => {
    setPanel(id)
    setMenuOpen(false)
  }

  const place = stationName(station)
  const initial = (place || user.name || 'S').trim().charAt(0).toUpperCase()

  return (
    <div className={'admin-app' + (menuOpen ? ' menu-open' : '')}>
      <button className="admin-menu-btn" type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}>☰</button>
      {menuOpen && <button className="admin-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className="admin-side">
        <div className="brand">
          <BrandLogo />
          <b className="brand-title">SWACHHRAIL</b>
          <span className="brand-sub">Outbound Housekeeping System</span>
          <button className="admin-close" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>×</button>
        </div>
        <nav>
          {items.map((item) => (
            <button key={item.id} type="button" className={panel === item.id ? 'on' : ''} onClick={() => openPanel(item.id)}>
              <NavIcon d={item.icon} accent={item.accent} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="ai-side" type="button" onClick={() => window.dispatchEvent(new Event('sr-open-ai'))}>
            <div className="ai-side-head">
              <b>AI ASSISTANT</b>
              <em>Beta</em>
            </div>
            <span>
              Hi {place}! Today: {stats.feedback.t} feedback entries, {stats.attendance.t} attendance captures, and {stats.photos.t} cleanliness photos at {place}.
            </span>
            <strong>Ask AI Assistant →</strong>
          </button>
          <div className="side-profile">
            <span className="side-avatar" aria-hidden="true">{initial}</span>
            <div>
              <b>{place}</b>
              <span>Robustrix · SwachhRail</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="admin-shell">
        <div className="admin-main">
          {notice && <p className="err">{notice}</p>}
          <header className="admin-homebar">
            <b>Home - {place}</b>
            <div className="admin-tools">
              <span className="admin-station-lock">{place}</span>
              <span>{formatDate(date)}</span>
              <button className="btn signout-btn" type="button" onClick={onLogout}>Sign Out</button>
            </div>
          </header>
          {panel === 'dash' && (
            <div className="admin-dash-wrap">
              <Dashboard user={user} station={station} onStation={onStation} date={date} D={stats} layout="admin" latestList={latest} />
              <SideStatus stats={stats} date={date} />
            </div>
          )}
          {panel === 'rounds' && <RoundWise records={db.records} trains={db.trains} station={station} date={date} />}
          {panel === 'feedback-target' && <FeedbackTargetPanel station={fileStation} />}
          {panel === 'view-feedback-target' && <ViewFeedbackTarget station={fileStation} />}
          {panel === 'photos' && <PhotoReportPanel records={db.records} trains={db.trains} station={station} date={date} />}
          {panel === 'attendance' && <AttendancePanel records={db.records} trains={db.trains} station={station} date={date} title="Attendance Photo Report" withPhotos />}
          {panel === 'attendance-report' && <AttendancePanel records={db.records} trains={db.trains} station={station} date={date} title="Attendance Report" withPhotos={false} />}
          {panel === 'create-emp' && <StaffDesk actor={user} mode="create" />}
          {panel === 'view-emp' && <StaffDesk actor={user} mode="view" />}
          {panel === 'password' && <PasswordPanel user={user} />}
          {panel === 'app-password' && <AppPasswordPanel users={db.users} station={station} />}
          <AIAssistant city={station} date={date} D={stats} />
        </div>
      </div>
    </div>
  )
}
