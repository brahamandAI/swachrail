import { useEffect, useMemo, useState } from 'react'
import { isoDate, stationName, statsFor } from './data.js'
import { maskPhone, maskPnr } from './photo.js'
import { logout, useDB } from './store.js'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Dashboard from './components/Dashboard.jsx'
import Passenger from './components/Passenger.jsx'
import Portal from './components/Portal.jsx'
import FeedbackApp from './components/FeedbackApp.jsx'
import AdminDesk from './components/AdminDesk.jsx'
import BackendPage from './components/BackendPage.jsx'
import AIAssistant from './components/AIAssistant.jsx'
import Login from './components/Login.jsx'
import Splash from './components/Splash.jsx'
import RailBg from './components/RailBg.jsx'
import { PrivacyPolicy, SiteFooter, TermsConditions } from './components/Legal.jsx'

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const sync = () => setHash(window.location.hash)
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  return hash
}

export default function App() {
  const db = useDB()
  const hash = useHash()
  const adminRoute = hash === '#admin'
  const staffRoute = hash === '#staff' || adminRoute
  const feedbackRoute = hash === '#feedback'
  const backendRoute = hash === '#backend'
  const boardRoute = hash === '#board'
  const privacyRoute = hash === '#privacy'
  const termsRoute = hash === '#terms'
  const user = db.users.find((u) => u.id === db.session?.userId) || null
  const [station, setStation] = useState('all')
  const [boardDate, setBoardDate] = useState(isoDate())
  const [crewStation, setCrewStation] = useState(user?.station || 'jodhpur')

  useEffect(() => {
    if (user?.station) setCrewStation(user.station)
  }, [user?.id, user?.role, user?.station])

  const duty = db.session?.date || isoDate()
  const viewStation = user?.station || 'jodhpur'
  const publicRecords = useMemo(
    () => db.records
      .filter((record) => record.type === 'feedback')
      .map((record) => ({ ...record, pnr: maskPnr(record.pnr), phone: maskPhone(record.phone) })),
    [db.records]
  )
  const publicStats = useMemo(
    () => statsFor(publicRecords, {}, station, boardDate),
    [publicRecords, station, boardDate]
  )
  const crewStats = useMemo(
    () => statsFor(db.records, db.trains, viewStation, duty),
    [db.records, db.trains, viewStation, duty]
  )
  const leaveStaff = () => {
    window.location.hash = ''
  }

  const splash = <Splash ready={db.ready} />
  const darkHome = !boardRoute && !feedbackRoute && !staffRoute && !backendRoute && !privacyRoute && !termsRoute
  const scene = <RailBg tone={darkHome || feedbackRoute ? (darkHome ? 'dark' : 'soft') : 'light'} />

  if (!db.ready) {
    return (
      <>
        {scene}
        {splash}
      </>
    )
  }

  const dbBanner = db.error ? <p className="err" style={{ padding: '18px 5vw 0' }}>{db.error}</p> : null

  const leaveFeedback = async () => {
    await logout()
    window.location.hash = '#feedback'
  }

  if (privacyRoute || termsRoute) {
    return (
      <>
        {scene}
        {splash}
        <main>
          {privacyRoute ? <PrivacyPolicy /> : <TermsConditions />}
        </main>
      </>
    )
  }

  if (feedbackRoute && !user) {
    return (
      <>
        {scene}
        {splash}
        <div className="feedback-app">
          <main>
            {dbBanner}
            <Login needsSetup={db.needsSetup} signInOnly />
          </main>
        </div>
      </>
    )
  }

  if (feedbackRoute && user) {
    if (user.role !== 'user') {
      return (
        <>
          {scene}
          {splash}
          <div className="feedback-app">
            <main>
              <div className="card auth-card" style={{ margin: '48px auto', maxWidth: 420 }}>
                <h2>Feedback app</h2>
                <p className="sub">Administrator accounts open the Admin panel only. Sign out and use Feedback staff credentials here.</p>
                <button className="btn" type="button" onClick={leaveFeedback}>Sign out</button>
                <a className="btn ghost" href="#admin" style={{ display: 'inline-block', marginTop: 10 }}>Go to Admin</a>
              </div>
            </main>
          </div>
        </>
      )
    }
    return (
      <>
        {scene}
        {splash}
        <div className="feedback-app">
          <main>
            {dbBanner}
            <FeedbackApp
              user={user}
              date={duty}
              records={db.records}
              notice={db.error}
              onLogout={leaveFeedback}
            />
          </main>
        </div>
      </>
    )
  }

  if (backendRoute && !user) {
    return (
      <>
        {scene}
        {splash}
        <main>
          {dbBanner}
          <Login needsSetup={db.needsSetup} onBack={leaveStaff} />
        </main>
      </>
    )
  }

  if (backendRoute && user.role !== 'admin') {
    return (
      <>
        {scene}
        {splash}
        <div className="admin-app">
          <div className="admin-main">
            <h2>Backend control</h2>
            <p className="sub">Only the administrator can edit saved entries.</p>
            <a className="btn" href="#admin">Admin dashboard</a>
          </div>
        </div>
      </>
    )
  }

  if (backendRoute) {
    return (
      <>
        {scene}
        {splash}
        <BackendPage
          user={user}
          onLogout={async () => {
            await logout()
            leaveStaff()
          }}
        />
      </>
    )
  }

  if (staffRoute && !user) {
    return (
      <>
        {scene}
        {splash}
        <main>
          {dbBanner}
          <Login needsSetup={db.needsSetup} onBack={leaveStaff} />
        </main>
      </>
    )
  }

  if (staffRoute && user) {
    if (user.role !== 'admin') {
      return (
        <>
          {scene}
          {splash}
          <main>
            <div className="card auth-card" style={{ margin: '48px auto', maxWidth: 420 }}>
              <h2>Admin panel</h2>
              <p className="sub">Feedback / staff accounts open the Feedback app only. Sign out and use Admin credentials here.</p>
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  await logout()
                  window.location.hash = '#feedback'
                }}
              >
                Sign out → Feedback
              </button>
            </div>
          </main>
        </>
      )
    }
    return (
      <>
        {scene}
        {splash}
        <AdminDesk
          user={user}
          date={duty}
          station={viewStation}
          onStation={setCrewStation}
          stats={crewStats}
          notice={db.error}
          onLogout={async () => {
            await logout()
            leaveStaff()
          }}
        />
      </>
    )
  }

  return (
    <>
      {scene}
      {splash}
      <main className={boardRoute ? '' : 'portal-shell'}>
        {dbBanner}
        {boardRoute ? (
          <>
            <Navbar publicSite date={boardDate} />
            <Hero stationName={stationName(station)} date={boardDate} />
            <Dashboard audience="public" station={station} onStation={setStation} date={boardDate} onDate={setBoardDate} D={publicStats} />
            <Passenger listOnly records={publicRecords} station={station} onStation={setStation} date={boardDate} onDate={setBoardDate} />
            <AIAssistant city={station} date={boardDate} D={publicStats} />
          </>
        ) : (
          <>
            <Navbar
              portal
              user={user}
              date={boardDate}
              onLogout={async () => {
                await logout()
                leaveStaff()
              }}
            />
            <Portal />
          </>
        )}
        <SiteFooter />
      </main>
    </>
  )
}
