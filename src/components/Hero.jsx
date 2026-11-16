import { formatDate } from '../data.js'

export default function Hero({ user, stationName, date }) {
  const staff = Boolean(user)
  return (
    <section className="hero">
      <div className="k">
        <span className="live"></span>
        {staff
          ? `${user.role === 'admin' ? 'Administrator' : 'Staff'} · ${stationName} · ${formatDate(date)}`
          : `Robustrix · ${stationName} · ${formatDate(date)}`}
      </div>
      <h1>SwachhRail AI</h1>
      <p className="sub">
        {staff
          ? `Duty console for ${formatDate(date)}. Attendance, train running and passenger feedback for this date.`
          : 'Share how clean your coach was. Your comment and photo appear on the station dashboard the same day.'}
      </p>
      <div>
        <a className="btn" href="#dash">Open dashboard</a>{' '}
        <a className="btn purple" href={staff ? '#ops' : '#feedback'}>{staff ? 'Enter records' : 'Give feedback'}</a>
      </div>
    </section>
  )
}
