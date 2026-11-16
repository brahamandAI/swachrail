import { useEffect, useState } from 'react'
import { formatDate, stationName } from '../data.js'
import { readPhoto } from '../photo.js'
import StationPicker from './StationPicker.jsx'
import { FeedbackBody, FeedbackFields } from './Passenger.jsx'
import { Camera } from './Passenger.jsx'
import { DUTY_ROUNDS, blankGrades } from '../stations.js'
import TrainSelect from './TrainSelect.jsx'
import { addAttendance, addFeedback, addPhoto, addStaff, addTrain, removeStaff, toggleRunning, useDB } from '../store.js'

const EMPTY_EMPLOYEE = {
  employeeId: '',
  name: '',
  designation: '',
  age: '',
  photo: '',
  fatherName: '',
  motherName: '',
  mobile: '',
  dob: '',
  aadhar: '',
  address: '',
  reinId: '',
  rakshakId: '',
  pan: '',
  policeVer: '',
  policeVerDt: '',
  pvc: '',
  pvcCliApplied: '',
  pvcIssueMonth: '',
  medical: '',
  medicalIssueMonth: '',
  education: '',
  documentStatus: '',
  accountName: '',
  accountNumber: '',
  ifsc: '',
  status: '',
  issueDate: '',
  validUptoDate: '',
  validUptoMonth: '',
  formateValidUpto: '',
  documentLink: '',
  notification: '',
  remarks: '',
  username: '',
  password: '',
  station: '',
}

function EmpSection({ title, children }) {
  return (
    <div className="emp-section">
      <div className="emp-section-title">{title}</div>
      <div className="emp-grid">{children}</div>
    </div>
  )
}

function EmpField({ label, required, children }) {
  return (
    <label className="field emp-field">
      {label}{required ? ' *' : ''}
      {children}
    </label>
  )
}

function Note({ text }) {
  if (!text) return null
  const ok = text.startsWith('Saved') || text.includes('can now sign in')
  return <div className={ok ? 's' : 'err'}>{text}</div>
}

export function Operations({ user, date, station }) {
  const [fileStation, setFileStation] = useState(station)
  useEffect(() => setFileStation(station), [station])
  const [fb, setFb] = useState({ name: '', phone: '', pnr: '', train: '', coachType: '3A', coachNo: '', berth: '', areas: [], grades: blankGrades(), rating: '5', message: '' })
  const [att, setAtt] = useState({ name: user.name, train: '', shift: 'Start' })
  const [photo, setPhoto] = useState({ train: '', area: '', note: '', image: '' })
  const [fbMsg, setFbMsg] = useState('')
  const [attMsg, setAttMsg] = useState('')
  const [photoMsg, setPhotoMsg] = useState('')

  const meta = { station: fileStation, date, by: user.id, byName: user.name }

  const submitFeedback = async (e) => {
    e.preventDefault()
    const error = await addFeedback({ ...meta, ...fb })
    setFbMsg(error || 'Saved on ' + formatDate(date) + '.')
    if (!error) setFb({ name: '', phone: '', pnr: '', train: '', coachType: '3A', coachNo: '', berth: '', areas: [], grades: blankGrades(), rating: '5', message: '' })
  }

  const submitAttendance = async (e) => {
    e.preventDefault()
    const error = await addAttendance({ ...meta, ...att })
    setAttMsg(error || 'Saved on ' + formatDate(date) + '.')
    if (!error) setAtt({ name: user.name, train: '', shift: 'Start' })
  }

  const submitPhoto = async (e) => {
    e.preventDefault()
    const error = await addPhoto({ ...meta, ...photo })
    setPhotoMsg(error || 'Saved on ' + formatDate(date) + '.')
    if (!error) setPhoto({ train: '', area: '', note: '', image: '' })
  }

  return (
    <section id="ops">
      <h2>Duty records · {formatDate(date)}</h2>
      <p className="sub">{stationName(fileStation)} · entered by {user.name}</p>
      {user.role === 'admin' && (
        <div style={{ maxWidth: 360 }}>
          <StationPicker label="File under station" value={fileStation} onChange={setFileStation} />
        </div>
      )}
      <div className="grid">
        <form className="card" id="fb" onSubmit={submitFeedback}>
          <div className="k">SwachhRail Feedback</div>
          <FeedbackFields form={fb} setForm={setFb} station={fileStation} />
          <button className="btn" type="submit">Save feedback</button>
          <Note text={fbMsg} />
        </form>

        <form className="card" id="attend" onSubmit={submitAttendance}>
          <div className="k">Attendance</div>
          <label className="field">Staff name<input value={att.name} onChange={(e) => setAtt({ ...att, name: e.target.value })} /></label>
          <TrainSelect station={fileStation} value={att.train} onChange={(train) => setAtt({ ...att, train })} />
          <label className="field">
            Duty time
            <select value={att.shift} onChange={(e) => setAtt({ ...att, shift: e.target.value })}>
              {DUTY_ROUNDS.map((shift) => <option key={shift}>{shift}</option>)}
            </select>
          </label>
          <button className="btn" type="submit">Save attendance</button>
          <Note text={attMsg} />
        </form>

        <form className="card" id="photo" onSubmit={submitPhoto}>
          <div className="k">Cleanliness photo</div>
          <TrainSelect station={fileStation} value={photo.train} onChange={(train) => setPhoto({ ...photo, train })} required />
          <label className="field">Coach or area<input value={photo.area} onChange={(e) => setPhoto({ ...photo, area: e.target.value })} /></label>
          <label className="field">Note<input value={photo.note} onChange={(e) => setPhoto({ ...photo, note: e.target.value })} required /></label>
          <Camera cameraOnly onShot={(image) => setPhoto((p) => ({ ...p, image }))} onError={setPhotoMsg} />
          {photo.image && <img className="shot" src={photo.image} alt="Selected cleanliness photo" />}
          <button className="btn" type="submit">Save photo audit</button>
          <Note text={photoMsg} />
        </form>
      </div>
    </section>
  )
}

export function RecordList({ records, station, date }) {
  const rows = records.filter(
    (r) => r.type !== 'running' && r.date === date && (station === 'all' || r.station === station)
  )
  return (
    <section id="records">
      <h2>Saved on this date</h2>
      <div className="card flat">
        {rows.length === 0 && <p className="empty">Nothing saved for {formatDate(date)}.</p>}
        <div className="records">
          {rows.map((r) => (
            <article key={r.id} className="rec">
              <b>{r.type === 'photo' ? 'Photo' : r.type === 'feedback' ? 'Feedback' : r.type === 'inspection' ? 'Rake' : r.type === 'platform' ? 'Platform' : r.type === 'station-clean' ? 'Station' : 'Attendance'}</b>
              <div>
                {r.type === 'feedback' && (
                  <>
                    <FeedbackBody r={r} />
                    {r.phone && <div>{r.phone}</div>}
                  </>
                )}
                {r.type === 'attendance' && (
                  <>
                    {r.name} · {r.shift} · Train {r.train || '—'}
                  </>
                )}
                {r.type === 'photo' && (
                  <>
                    Train {r.train} · {r.area || 'area not set'}
                    <div>{r.note}</div>
                    <div className="pair">
                      {(r.before || r.image) && <img className="shot" src={r.before || r.image} alt="Before" />}
                      {r.after && <img className="shot" src={r.after} alt="After" />}
                    </div>
                  </>
                )}
                {r.type === 'inspection' && (
                  <>
                    Train {r.train} · Coach {r.coach}
                    <div>{Object.entries(r.checks || {}).map(([name, value]) => `${name}: ${value}`).join(' · ')}</div>
                    {r.note && <div>{r.note}</div>}
                    {r.image && <img className="shot" src={r.image} alt="" />}
                  </>
                )}
                {r.type === 'platform' && (
                  <>
                    Platform {r.platform}
                    <div>{[r.machine && 'Machine', r.waste && 'Waste cleared', r.washed && 'Washed', r.drain && 'Drain cleared'].filter(Boolean).join(' · ')}</div>
                    <div>{r.note}</div>
                    {r.image && <img className="shot" src={r.image} alt="" />}
                  </>
                )}
                {r.type === 'station-clean' && (
                  <>
                    {r.area} · {r.rating}/5
                    <div>{r.note}</div>
                    {r.image && <img className="shot" src={r.image} alt="" />}
                  </>
                )}
                <small>
                  {stationName(r.station)} · {r.byName} · {new Date(r.at).toLocaleString('en-IN')}
                  {r.placeName ? ` · ${r.placeName}` : ''}
                </small>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function StaffDesk({ actor, mode = 'both' }) {
  const { users, trains } = useDB()
  const [form, setForm] = useState({ ...EMPTY_EMPLOYEE, station: actor.station })
  const [msg, setMsg] = useState('')
  const [trainStation, setTrainStation] = useState(actor.station)
  const [trainNo, setTrainNo] = useState('')
  const [trainMsg, setTrainMsg] = useState('')
  const [openId, setOpenId] = useState('')

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const create = async (e) => {
    e.preventDefault()
    const username = form.username.trim() || form.employeeId.trim()
    const error = await addStaff({
      ...form,
      username,
      password: form.password,
    })
    setMsg(error || `${form.name.trim()} created successfully.`)
    if (!error) setForm({ ...EMPTY_EMPLOYEE, station: actor.station })
  }

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      set('photo', await readPhoto(file))
      setMsg('')
    } catch (err) {
      setMsg(err.message)
    }
  }

  const saveTrain = async (e) => {
    e.preventDefault()
    const error = await addTrain(trainStation, trainNo)
    setTrainMsg(error || `Saved train ${trainNo.trim()} at ${stationName(trainStation)}.`)
    if (!error) setTrainNo('')
  }

  const people = users.filter((u) => u.role === 'user')
  const selected = people.find((u) => u.id === openId)

  return (
    <section id="crew">
      <h2>{mode === 'create' ? 'Create Employee' : mode === 'view' ? 'View Employee' : 'Station control'}</h2>

      {mode !== 'view' && (
        <form className="card flat emp-form" onSubmit={create}>
          <EmpSection title="Basic Information">
            <EmpField label="Employee ID"><input value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} placeholder="Employee ID" /></EmpField>
            <EmpField label="Full Name" required><input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Full name" /></EmpField>
            <EmpField label="Designation" required><input value={form.designation} onChange={(e) => set('designation', e.target.value)} required placeholder="Designation" /></EmpField>
            <EmpField label="Age"><input value={form.age} inputMode="numeric" onChange={(e) => set('age', e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Age" /></EmpField>
          </EmpSection>

          <EmpSection title="Photo">
            <EmpField label="Employee Photo">
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onPhoto} />
              <span className="empty">Supported formats: JPG, PNG, GIF</span>
              {form.photo && <img className="shot emp-photo" src={form.photo} alt="Employee" />}
            </EmpField>
          </EmpSection>

          <EmpSection title="Personal Information">
            <EmpField label="Father's Name"><input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} /></EmpField>
            <EmpField label="Mother's Name"><input value={form.motherName} onChange={(e) => set('motherName', e.target.value)} /></EmpField>
            <EmpField label="Mobile Number"><input value={form.mobile} inputMode="tel" onChange={(e) => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} /></EmpField>
            <EmpField label="Date of Birth"><input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} /></EmpField>
            <EmpField label="Aadhar Number"><input value={form.aadhar} inputMode="numeric" onChange={(e) => set('aadhar', e.target.value.replace(/\D/g, '').slice(0, 12))} /></EmpField>
            <EmpField label="Address"><input value={form.address} onChange={(e) => set('address', e.target.value)} /></EmpField>
          </EmpSection>

          <EmpSection title="ID Information">
            <EmpField label="REIN ID"><input value={form.reinId} onChange={(e) => set('reinId', e.target.value)} /></EmpField>
            <EmpField label="Rakshak ID"><input value={form.rakshakId} onChange={(e) => set('rakshakId', e.target.value)} /></EmpField>
            <EmpField label="PAN Card"><input value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase().slice(0, 10))} /></EmpField>
            <EmpField label="Police Ver."><input value={form.policeVer} onChange={(e) => set('policeVer', e.target.value)} /></EmpField>
            <EmpField label="Police Ver. Dt"><input value={form.policeVerDt} onChange={(e) => set('policeVerDt', e.target.value)} /></EmpField>
          </EmpSection>

          <EmpSection title="Documents & Medical">
            <EmpField label="PVC"><input value={form.pvc} onChange={(e) => set('pvc', e.target.value)} /></EmpField>
            <EmpField label="PVC Cli Applied"><input value={form.pvcCliApplied} onChange={(e) => set('pvcCliApplied', e.target.value)} /></EmpField>
            <EmpField label="PVC Issue Month"><input value={form.pvcIssueMonth} onChange={(e) => set('pvcIssueMonth', e.target.value)} /></EmpField>
            <EmpField label="Medical"><input value={form.medical} onChange={(e) => set('medical', e.target.value)} /></EmpField>
            <EmpField label="Medical Issue Month"><input value={form.medicalIssueMonth} onChange={(e) => set('medicalIssueMonth', e.target.value)} /></EmpField>
            <EmpField label="Education"><input value={form.education} onChange={(e) => set('education', e.target.value)} /></EmpField>
            <EmpField label="Document Status"><input value={form.documentStatus} onChange={(e) => set('documentStatus', e.target.value)} /></EmpField>
          </EmpSection>

          <EmpSection title="Bank Information">
            <EmpField label="Account Name"><input value={form.accountName} onChange={(e) => set('accountName', e.target.value)} /></EmpField>
            <EmpField label="Account Number"><input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} /></EmpField>
            <EmpField label="IFSC Code"><input value={form.ifsc} onChange={(e) => set('ifsc', e.target.value.toUpperCase())} /></EmpField>
          </EmpSection>

          <EmpSection title="Status & Validity">
            <EmpField label="Status"><input value={form.status} onChange={(e) => set('status', e.target.value)} placeholder="Enter Status" /></EmpField>
            <EmpField label="Issue Date"><input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} /></EmpField>
            <EmpField label="Valid Upto Date"><input type="date" value={form.validUptoDate} onChange={(e) => set('validUptoDate', e.target.value)} /></EmpField>
            <EmpField label="Valid Upto Month"><input value={form.validUptoMonth} onChange={(e) => set('validUptoMonth', e.target.value)} /></EmpField>
            <EmpField label="Formate Valid Upto"><input value={form.formateValidUpto} onChange={(e) => set('formateValidUpto', e.target.value)} /></EmpField>
            <EmpField label="Document Link"><input value={form.documentLink} onChange={(e) => set('documentLink', e.target.value)} placeholder="https://" /></EmpField>
            <EmpField label="Notification"><input value={form.notification} onChange={(e) => set('notification', e.target.value)} /></EmpField>
            <label className="field emp-field emp-span-2">
              Remarks
              <textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="Add any additional remarks or notes..." rows={3} />
            </label>
          </EmpSection>

          <EmpSection title="Login Access">
            <EmpField label="Username / App login"><input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="Defaults to Employee ID" autoComplete="off" /></EmpField>
            <EmpField label="Password" required><input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} autoComplete="new-password" /></EmpField>
            <div className="emp-field">
              <StationPicker label="Station" value={form.station} onChange={(id) => set('station', id)} />
            </div>
          </EmpSection>

          <div className="emp-actions">
            <button className="btn ghost" type="button" onClick={() => { setForm({ ...EMPTY_EMPLOYEE, station: actor.station }); setMsg('') }}>Cancel</button>
            <button className="btn" type="submit">Create Employee</button>
          </div>
          <Note text={msg} />
        </form>
      )}

      {mode !== 'create' && (
        <div className="two" style={{ marginTop: mode === 'view' ? 0 : 18 }}>
          <div className="card flat">
            <div className="k">Employees</div>
            <div className="records" style={{ marginTop: 12 }}>
              {people.map((u) => (
                <article key={u.id} className="rec">
                  <b>{u.name}</b>
                  <div>
                    {u.profile?.employeeId ? `ID ${u.profile.employeeId} · ` : ''}
                    {u.profile?.designation ? `${u.profile.designation} · ` : ''}
                    {u.username} · {stationName(u.station)}
                    <div className="row" style={{ marginTop: 8 }}>
                      <button className="btn ghost" type="button" onClick={() => setOpenId(openId === u.id ? '' : u.id)}>{openId === u.id ? 'Hide' : 'View'}</button>
                      <button className="btn ghost" type="button" onClick={() => removeStaff(u.id)}>Remove</button>
                    </div>
                  </div>
                </article>
              ))}
              {people.length === 0 && <p className="empty">No staff accounts yet.</p>}
            </div>
          </div>

          {selected && (
            <div className="card flat">
              <div className="k">Employee details</div>
              {selected.profile?.photo && <img className="shot emp-photo" src={selected.profile.photo} alt="" />}
              <div className="facts" style={{ marginTop: 10 }}>
                {[
                  selected.profile?.employeeId && `Employee ID: ${selected.profile.employeeId}`,
                  `Name: ${selected.name}`,
                  selected.profile?.designation && `Designation: ${selected.profile.designation}`,
                  selected.profile?.age && `Age: ${selected.profile.age}`,
                  selected.profile?.mobile && `Mobile: ${selected.profile.mobile}`,
                  selected.profile?.fatherName && `Father: ${selected.profile.fatherName}`,
                  selected.profile?.motherName && `Mother: ${selected.profile.motherName}`,
                  selected.profile?.dob && `DOB: ${selected.profile.dob}`,
                  selected.profile?.aadhar && `Aadhar: ${selected.profile.aadhar}`,
                  selected.profile?.address && `Address: ${selected.profile.address}`,
                  selected.profile?.reinId && `REIN: ${selected.profile.reinId}`,
                  selected.profile?.rakshakId && `Rakshak: ${selected.profile.rakshakId}`,
                  selected.profile?.pan && `PAN: ${selected.profile.pan}`,
                  selected.profile?.accountName && `Bank: ${selected.profile.accountName}`,
                  selected.profile?.accountNumber && `A/C: ${selected.profile.accountNumber}`,
                  selected.profile?.ifsc && `IFSC: ${selected.profile.ifsc}`,
                  selected.profile?.status && `Status: ${selected.profile.status}`,
                  selected.profile?.remarks && `Remarks: ${selected.profile.remarks}`,
                  `Login: ${selected.username}`,
                  `Station: ${stationName(selected.station)}`,
                ].filter(Boolean).map((line) => <div key={line}>{line}</div>)}
              </div>
            </div>
          )}

          <form className="card" onSubmit={saveTrain}>
            <div className="k">Configured trains</div>
            <p className="empty">Add the trains that actually serve a station. Mark them running from the dashboard on the duty date.</p>
            <StationPicker label="Station" value={trainStation} onChange={setTrainStation} />
            <label className="field">Train number<input value={trainNo} onChange={(e) => setTrainNo(e.target.value)} placeholder="04811" /></label>
            <button className="btn" type="submit">Add train</button>
            <Note text={trainMsg} />
            <div className="chips" style={{ marginTop: 12 }}>
              {(trains[trainStation] || []).map((no) => (
                <span key={no} className="chip">{no}</span>
              ))}
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

export function markRunning(entry, date, user) {
  return toggleRunning({ station: entry.station, date, train: entry.no, by: user.id, byName: user.name })
}
