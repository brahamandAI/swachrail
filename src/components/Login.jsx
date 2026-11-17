import { useState } from 'react'
import { isoDate } from '../data.js'
import StationPicker from './StationPicker.jsx'
import { login, setupAdmin } from '../store.js'
import BrandLogo, { PoweredBy } from './BrandLogo.jsx'
import InstallButton from './InstallButton.jsx'

export default function Login({ needsSetup, onBack, signInOnly = false }) {
  const [mode, setMode] = useState(!signInOnly && needsSetup ? 'create' : 'sign')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [station, setStation] = useState('jodhpur')
  const [err, setErr] = useState('')
  const [showPass, setShowPass] = useState(false)
  const creating = !signInOnly && mode === 'create'

  const choose = (next) => {
    setMode(next)
    setErr('')
    setPassword('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const today = isoDate()
    const portal = signInOnly ? 'feedback' : 'admin'
    const error = creating
      ? await setupAdmin({ name, username, password, station, date: today })
      : await login({ username, password, date: today, portal })
    setErr(error)
    if (error) return
    setPassword('')
  }

  if (signInOnly) {
    return (
      <div className="auth fb-login">
        <form className="card auth-card" onSubmit={submit}>
          <BrandLogo className="fb-brand" />
          <h1>SwachhRail Feedback</h1>
          <label className="field">
            User ID
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="User ID" required />
          </label>
          <label className="field">
            Password
            <div className="pass-wrap">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Password" required />
              <button className="pass-toggle" type="button" onClick={() => setShowPass((v) => !v)}>{showPass ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <button className="btn" type="submit">Login</button>
          <div className="err">{err}</div>
          <PoweredBy />
          <p className="legal-links">
            <a href="#privacy">Privacy Policy</a>
            {' · '}
            <a href="#terms">Terms &amp; Conditions</a>
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <div className="k">{signInOnly ? 'SwachhRail Feedback' : 'Official Logins'}</div>
        <h1>{signInOnly ? 'Sign in' : 'SwachhRail AI'}</h1>
        {!signInOnly && (
          <div className="auth-switch" role="tablist" aria-label="Official login">
            <button type="button" className={creating ? '' : 'on'} onClick={() => choose('sign')}>Sign in</button>
            <button type="button" className={creating ? 'on' : ''} onClick={() => choose('create')}>Create administrator</button>
          </div>
        )}
        <p className="sub">
          {signInOnly
            ? 'Sign in with the username and password from your administrator. Feedback, Photo Report, Attendance and the summaries open after sign in.'
            : creating
              ? 'Create the administrator. Passengers never see this screen.'
              : 'Administrator sign-in only. Staff use the Feedback app.'}
        </p>
        {creating && (
          <label className="field">
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
        )}
        <label className="field">
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={creating ? 'new-password' : 'current-password'}
            required
          />
        </label>
        {creating && <StationPicker label="Home station" value={station} onChange={setStation} />}
        <button className="btn" type="submit">{creating ? 'Create administrator' : 'Sign in'}</button>
        {!signInOnly && <button className="btn ghost" type="button" onClick={onBack}>Back to website</button>}
        <div className="err">{err}</div>
        {!signInOnly && <InstallButton />}
      </form>
    </div>
  )
}
