import { formatDate } from '../data.js'
import BrandLogo from './BrandLogo.jsx'
import InstallButton from './InstallButton.jsx'

function stayOnConsole(id) {
  return (e) => {
    if (window.location.hash !== '#staff') return
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }
}

export default function Navbar({ user, stationName, date, onLogout, publicSite, adminPanel, portal, obhsApp }) {
  return (
    <nav>
      <a className="logo brand-lockup" href={obhsApp ? '#feedback' : '#'}>
        <BrandLogo className="nav-brand" />
        <span>{obhsApp ? 'SWACHHRAIL FEEDBACK' : 'SWACHHRAIL AI'}</span>
      </a>
      <div className="nav-links">
        {!publicSite && !portal && user && <span className="who">{user.name} · {user.role === 'admin' ? 'Admin' : 'Staff'} · {stationName}</span>}
        {portal || obhsApp ? null : <span className="who">{formatDate(date)}</span>}
        {portal || obhsApp ? null : publicSite ? (
          <a href="#board">Dashboard</a>
        ) : (
          <a href="#staff" onClick={stayOnConsole('dash')}>Dashboard</a>
        )}
        {!portal && !obhsApp && !publicSite && <a href="#staff" onClick={stayOnConsole('ops')}>Records</a>}
        {publicSite && <a href="#">Products</a>}
        {!publicSite && !portal && !obhsApp && user?.role === 'admin' && <a href="#staff" onClick={stayOnConsole('crew')}>Crew</a>}
        {!publicSite && !portal && !obhsApp && user?.role === 'admin' && <a className={adminPanel ? 'official' : ''} href="#admin">Admin panel</a>}
        {publicSite && <a className="official" href="#staff">Official Logins</a>}
        {portal && <a className="official" href="#staff">{user ? 'Duty console' : 'Log in'}</a>}
        {portal && user?.role === 'admin' && <a href="#admin">Admin panel</a>}
        {portal && user && <button className="btn ghost" type="button" onClick={onLogout}>Sign out</button>}
        {!publicSite && !portal && <button className="btn ghost" type="button" onClick={onLogout}>Sign out</button>}
        {!obhsApp && <InstallButton />}
      </div>
    </nav>
  )
}
