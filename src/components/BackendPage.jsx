import { useMemo, useState } from 'react'
import { isoDate, stationName } from '../data.js'
import { FeedbackFields } from './Passenger.jsx'
import { blankGrades } from '../stations.js'
import { addAttendance, addFeedback, removeRecord, removeStaff, updateAccess, updateRecord, useDB } from '../store.js'

const AC = ['1A', '2A', '3A', '3E', 'CC', 'EC']
const NON_AC = ['SL', '2S', 'EV', 'GN']
const MENUS = [
  ['dash', 'Dashboard'],
  ['ac', 'Create AC Feedback'],
  ['nonac', 'Create Non AC Feedback'],
  ['tte', 'Create TTE Feedback'],
  ['edit-passenger', 'Edit Passenger Feedback'],
  ['edit-tte', 'Edit TTE Feedback'],
  ['attend', 'Create Attendance'],
  ['edit-attend', 'Edit Attendance'],
  ['other', 'Other entries'],
  ['people', 'Employees'],
]

const blank = (coachType) => ({
  name: '', phone: '', pnr: '', train: '', coachType, coachNo: '', berth: '', areas: [], grades: blankGrades(), rating: '5', message: '',
})

function monthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function Note({ text }) {
  if (!text) return null
  const ok = text.startsWith('Saved') || text === 'Updated.' || text === 'Removed.'
  return <p className={ok ? 'ok' : 'bad'}>{text}</p>
}

function inRange(row, from, to) {
  if (from && row.date < from) return false
  if (to && row.date > to) return false
  return true
}

export default function BackendPage({ user, onLogout }) {
  const db = useDB()
  const [menu, setMenu] = useState('dash')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState(blank('3A'))
  const [attend, setAttend] = useState({ name: user.name, train: '', shift: 'Start', date: isoDate() })
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(isoDate())
  const [train, setTrain] = useState('')
  const [edit, setEdit] = useState(null)
  const [account, setAccount] = useState(null)

  const stationLabel = stationName(user.station).toLowerCase()
  const counts = useMemo(() => ({
    feedback: db.records.filter((row) => row.type === 'feedback').length,
    attendance: db.records.filter((row) => row.type === 'attendance').length,
    other: db.records.filter((row) => row.type !== 'feedback' && row.type !== 'attendance' && row.type !== 'running').length,
  }), [db.records])

  const rowsFor = (kind) => db.records.filter((row) => {
    if (kind === 'passenger' && !(row.type === 'feedback' && row.kind !== 'tte')) return false
    if (kind === 'tte' && !(row.type === 'feedback' && row.kind === 'tte')) return false
    if (kind === 'attendance' && row.type !== 'attendance') return false
    if (kind === 'other' && (row.type === 'feedback' || row.type === 'attendance' || row.type === 'running')) return false
    if (!inRange(row, from, to)) return false
    if (train && !String(row.train || '').includes(train.trim())) return false
    return true
  })

  const saveFeedback = async (event, kind) => {
    event.preventDefault()
    const error = await addFeedback({
      ...form,
      kind,
      pnrSkipped: kind === 'tte',
      station: user.station,
      date: isoDate(),
      by: user.id,
      byName: user.name,
    })
    setMsg(error || 'Saved.')
    if (!error) setForm(blank(kind === 'passenger' && menu === 'nonac' ? 'SL' : '3A'))
  }

  const saveAttend = async (event) => {
    event.preventDefault()
    const error = await addAttendance({
      ...attend,
      station: user.station,
      by: user.id,
      byName: user.name,
    })
    setMsg(error || 'Saved.')
    if (!error) setAttend({ name: user.name, train: '', shift: 'Start', date: isoDate() })
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    const error = await updateRecord(edit)
    setMsg(error || 'Updated.')
    if (!error) setEdit(null)
  }

  const drop = async (id) => {
    if (!window.confirm('Remove this entry?')) return
    const error = await removeRecord(id)
    setMsg(error || 'Removed.')
  }

  const saveAccount = async (event) => {
    event.preventDefault()
    const error = await updateAccess(account)
    setMsg(error || 'Updated.')
    if (!error) setAccount(null)
  }

  const list = (kind, title) => {
    const rows = rowsFor(kind)
    return (
      <section>
        <h2>{title}</h2>
        <div className="filters">
          <label className="field">Date from<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field">Date to<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="field">Train<input value={train} placeholder="Train number" onChange={(e) => setTrain(e.target.value)} /></label>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Station</th><th>Detail</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{stationName(row.station)}</td>
                <td>{row.type === 'attendance' ? `${row.name} · ${row.shift} · ${row.train || '—'}` : row.type === 'feedback' ? `${row.name} · ${row.train} · ${row.coachType} ${row.coachNo} · ${row.message}` : `${row.type} · ${row.train || row.area || row.note || ''}`}</td>
                <td>
                  <button type="button" onClick={() => { setEdit({ ...row }); setMsg('') }}>Edit</button>
                  <button type="button" onClick={() => drop(row.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">Nothing in this date range.</p>}
        {edit && (
          <form className="editor" onSubmit={saveEdit}>
            <h3>Edit entry</h3>
            <label className="field">Date<input type="date" value={edit.date || ''} onChange={(e) => setEdit({ ...edit, date: e.target.value })} required /></label>
            <label className="field">Station<input value={edit.station || ''} onChange={(e) => setEdit({ ...edit, station: e.target.value })} /></label>
            {edit.type !== 'platform' && edit.type !== 'station-clean' && (
              <label className="field">Train<input value={edit.train || ''} onChange={(e) => setEdit({ ...edit, train: e.target.value })} /></label>
            )}
            {edit.name != null && <label className="field">Name<input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>}
            {edit.type === 'feedback' && (
              <>
                <label className="field">Phone<input value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></label>
                <label className="field">PNR<input value={edit.pnr || ''} onChange={(e) => setEdit({ ...edit, pnr: e.target.value })} /></label>
                <label className="field">Coach type<input value={edit.coachType || ''} onChange={(e) => setEdit({ ...edit, coachType: e.target.value })} /></label>
                <label className="field">Coach<input value={edit.coachNo || ''} onChange={(e) => setEdit({ ...edit, coachNo: e.target.value })} /></label>
                <label className="field">Comment<textarea value={edit.message || ''} onChange={(e) => setEdit({ ...edit, message: e.target.value })} /></label>
              </>
            )}
            {edit.type === 'attendance' && (
              <label className="field">Shift
                <select value={edit.shift || 'Start'} onChange={(e) => setEdit({ ...edit, shift: e.target.value })}>
                  <option>Start</option><option>Mid</option><option>End</option>
                </select>
              </label>
            )}
            {edit.note != null && edit.type !== 'feedback' && edit.type !== 'attendance' && (
              <label className="field">Note<input value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></label>
            )}
            <button className="go solid" type="submit">Save changes</button>
            <button type="button" onClick={() => setEdit(null)}>Cancel</button>
          </form>
        )}
      </section>
    )
  }

  return (
    <div className="backend-simple">
      <aside>
        <b>Backend System - {stationLabel}</b>
        <nav>
          {MENUS.map(([id, label]) => (
            <button key={id} type="button" className={menu === id ? 'on' : ''} onClick={() => { setMenu(id); setMsg(''); setEdit(null); if (id === 'nonac') setForm(blank('SL')); if (id === 'ac' || id === 'tte') setForm(blank('3A')) }}>
              {label}
            </button>
          ))}
        </nav>
        <button className="out" type="button" onClick={onLogout}>Sign out</button>
      </aside>
      <main>
        <div className="top">
          <span />
          <a className="go" href="#admin">User Dashboard</a>
        </div>
        <Note text={msg} />
        {menu === 'dash' && (
          <section>
            <h2>Dashboard</h2>
            <div className="stats">
              <article><b>{counts.feedback}</b><span>Feedback</span></article>
              <article><b>{counts.attendance}</b><span>Attendance</span></article>
              <article><b>{counts.other}</b><span>Other entries</span></article>
            </div>
          </section>
        )}
        {(menu === 'ac' || menu === 'nonac' || menu === 'tte') && (
          <section>
            <h2>{MENUS.find((item) => item[0] === menu)[1]}</h2>
            <form onSubmit={(event) => saveFeedback(event, menu === 'tte' ? 'tte' : 'passenger')}>
              <FeedbackFields
                form={form}
                setForm={setForm}
                hidePnr={menu === 'tte'}
                nameLabel={menu === 'tte' ? 'TTE name' : 'Passenger name'}
                coachTypes={menu === 'nonac' ? NON_AC : menu === 'ac' ? AC : undefined}
              />
              <button className="go solid" type="submit">Save</button>
            </form>
          </section>
        )}
        {menu === 'edit-passenger' && list('passenger', 'Edit Passenger Feedback')}
        {menu === 'edit-tte' && list('tte', 'Edit TTE Feedback')}
        {menu === 'attend' && (
          <section>
            <h2>Create Attendance</h2>
            <form onSubmit={saveAttend}>
              <label className="field">Date<input type="date" value={attend.date} onChange={(e) => setAttend({ ...attend, date: e.target.value })} required /></label>
              <label className="field">Employee<input value={attend.name} onChange={(e) => setAttend({ ...attend, name: e.target.value })} required /></label>
              <label className="field">Train<input value={attend.train} onChange={(e) => setAttend({ ...attend, train: e.target.value })} /></label>
              <label className="field">Shift
                <select value={attend.shift} onChange={(e) => setAttend({ ...attend, shift: e.target.value })}>
                  <option>Start</option><option>Mid</option><option>End</option>
                </select>
              </label>
              <button className="go solid" type="submit">Save</button>
            </form>
          </section>
        )}
        {menu === 'edit-attend' && list('attendance', 'Edit Attendance')}
        {menu === 'other' && list('other', 'Other entries')}
        {menu === 'people' && (
          <section>
            <h2>Employees</h2>
            <table>
              <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Station</th><th></th></tr></thead>
              <tbody>
                {db.users.map((person) => (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>{person.username}</td>
                    <td>{person.role === 'admin' ? 'Administrator' : 'Staff'}</td>
                    <td>{stationName(person.station)}</td>
                    <td>
                      <button type="button" onClick={() => setAccount({ ...person, password: '' })}>Edit</button>
                      {person.role !== 'admin' && person.id !== user.id && (
                        <button type="button" onClick={async () => {
                          if (!window.confirm('Remove this login?')) return
                          const error = await removeStaff(person.id)
                          setMsg(error || 'Removed.')
                        }}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {account && (
              <form className="editor" onSubmit={saveAccount}>
                <h3>Edit access</h3>
                <label className="field">Name<input value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} required /></label>
                <label className="field">Username<input value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} required /></label>
                <label className="field">Station<input value={account.station} onChange={(e) => setAccount({ ...account, station: e.target.value })} /></label>
                <label className="field">New password<input type="password" value={account.password} placeholder="Blank keeps the current password" onChange={(e) => setAccount({ ...account, password: e.target.value })} /></label>
                <button className="go solid" type="submit">Save access</button>
                <button type="button" onClick={() => setAccount(null)}>Cancel</button>
              </form>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
