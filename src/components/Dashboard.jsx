import { fmt, formatDate, stationName } from '../data.js'
import StationPicker from './StationPicker.jsx'
import { useCountUp } from '../hooks.js'
import { LineChart, OpsMixChart } from './Charts.jsx'
import { markRunning } from './Operations.jsx'

function Kpi({ label, value, color, sub }) {
  const n = useCountUp(value)
  return (
    <div className="card kpi-card" style={{ borderColor: color + '88' }}>
      <div className="k" style={{ color }}>{label}</div>
      <div className="v">{fmt(n)}</div>
      {sub != null && <div className="s">Today: {fmt(n)} · This month: {fmt(sub)}</div>}
    </div>
  )
}

export default function Dashboard({ user, station, onStation, date, onDate, D, audience, layout, latestList }) {
  if (audience === 'public') {
    const score = Math.round((D.avgRating / 5) * 100)
    return (
      <section id="dash">
        <h2>{stationName(station)} · {formatDate(date)}</h2>
        <div className="filters">
          <StationPicker allowAll value={station} onChange={onStation} />
          <label className="field">Date<input type="date" value={date} aria-label="Date" onChange={(e) => onDate(e.target.value)} /></label>
        </div>
        <div className="grid">
          <Kpi label="Feedback" value={D.feedback.t} color="#35f08a" />
          <Kpi label="Photos" value={D.photos.t} color="#ff8a1f" />
          <Kpi label="This month" value={D.feedback.m} color="#0f5f8a" />
        </div>
        <div className="two">
          <div className="card"><div className="k">Feedback this week</div><LineChart data={D.feedback} /></div>
          <div className="card"><div className="k">Photos this week</div><LineChart data={D.photos} /></div>
          <div className="card flat" style={{ textAlign: 'center' }}>
            <div className="k">Average rating</div>
            <br />
            <div className="ring" style={{ background: `conic-gradient(var(--c) ${score}%, #ffffff14 0)` }}>
              <b>{D.avgRating ? D.avgRating.toFixed(1) : '—'}</b>
            </div>
            <p className="s">{D.feedback.t ? 'From passenger ratings on this date' : 'No ratings on this date'}</p>
          </div>
          <div className="card flat">
            <div className="k">Latest feedback</div>
            <p style={{ color: '#0f5f8a' }}>
              {D.latest ? `${D.latest.name} · ${'★'.repeat(+D.latest.rating || 0)}` : 'No feedback on this date'}
            </p>
            <p>{D.latest?.message || 'Comments and coach photos show here as soon as passengers send them.'}</p>
          </div>
        </div>
      </section>
    )
  }

  const desk = layout === 'admin'
  const kpis = [
    ['Feedback', D.feedback.t, '#35f08a', desk ? D.feedback.m : null],
    ['Attendance', D.attendance.t, '#b36bff', desk ? D.attendance.m : null],
    ['Cleanliness photos', D.photos.t, '#ff8a1f', desk ? D.photos.m : null],
    ['Avg grade', D.avgRating || 0, '#0f5f8a', null],
    ['Trains running', D.trains.run, '#0f5f8a', desk ? D.trains.month : null],
    ['Configured trains', D.trains.total, '#52657a', null],
  ]
  const snaps = [
    ['Feedback', D.feedback],
    ['Attendance', D.attendance],
    ['Photos', D.photos],
  ]
  const status = D.health === 100 ? 'Complete for this date' : D.health === 0 ? 'Awaiting records' : 'In progress'
  const latest = D.latest
    ? `${D.latest.name} · ${D.latest.phone || 'no phone'}`
    : 'No feedback on this date'

  return (
    <section id="dash" className={desk ? 'admin-dash' : undefined}>
      {!desk && (
        <h2>
          {user.name} · {stationName(station)} · {formatDate(date)}
        </h2>
      )}
      {user.role === 'admin' && !desk && (
        <div className="filters">
          <StationPicker allowAll label="Station" value={station} onChange={onStation} />
        </div>
      )}

      <div className="grid">
        {kpis.map((k) => (
          <Kpi key={k[0]} label={k[0]} value={k[1]} color={k[2]} sub={k[3]} />
        ))}
      </div>

      <div className="two">
        <div className="card"><div className="k">Feedback this week</div><LineChart data={D.feedback} /></div>
        <div className="card"><div className="k">Attendance this week</div><LineChart data={D.attendance} /></div>
        <div className="card"><div className="k">Photos this week</div><LineChart data={D.photos} /></div>
        <div className="card"><div className="k">Duty-date mix</div><OpsMixChart D={D} /></div>
      </div>

      <div className="two">
        <div className="card flat">
          <div className="k">Operations snapshot</div>
          {snaps.map(([name, d]) => (
            <p key={name}>
              <b style={{ color: d.col }}>{name}</b> · Peak {d.peak}
              <br />
              This date <b>{fmt(d.t)}</b> · Month <b>{fmt(d.m)}</b>
              <span className="bar">
                <i style={{ width: Math.min(100, d.m ? (d.t / Math.max(d.avg, 1)) * 40 : 0) + '%', background: d.col }}></i>
              </span>
              <span className="s">Average {fmt(d.avg)} / day this month</span>
            </p>
          ))}
          <p>
            <b style={{ color: '#0f5f8a' }}>Train coverage</b> · {D.trains.total ? Math.round((D.trains.run / D.trains.total) * 100) : 0}% running
            <br />
            This date <b>{D.trains.run}</b> · Month marks <b>{D.trains.month}</b>
            <br />
            <span className="s">{D.trains.total} configured trains</span>
          </p>
          <p className="k">
            Activity on this date <b style={{ fontSize: 22, color: '#fff' }}>{fmt(D.total)}</b>
            <br />
            <span className="s">{fmt(D.load)} this month · {fmt(D.last7)} in the last 7 days</span>
          </p>
        </div>
        <div className="card flat">
          <div className="k">Latest feedback</div>
          {desk && latestList?.length ? (
            <div className="records">
              {latestList.map((row) => (
                <article key={row.id} className="rec">
                  <b>{row.kind === 'tte' ? 'TTE' : 'Passenger'}</b>
                  <div>
                    {row.name} · {row.phone || 'no phone'} · PNR {row.pnr || '—'}
                    <small>{row.date} · Train {row.train || '—'}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ color: '#0f5f8a' }}>{latest}</p>
          )}
          {!desk && (
            <>
              <br />
              <div className="ring" style={{ background: `conic-gradient(var(--c) ${D.health}%, #ffffff14 0)`, margin: '0 auto' }}>
                <b>{D.health}%</b>
              </div>
              <p className="s">{status}</p>
            </>
          )}
        </div>
      </div>

      <div className="card flat" style={{ marginTop: 14 }}>
        <div className="k">Trains · Total {D.trains.total} · click to mark running on {formatDate(date)}</div>
        <br />
        {D.trains.list.length === 0 ? (
          <p className="empty">No trains configured{user.role === 'admin' ? '. Add them in Station control.' : ' yet.'}</p>
        ) : (
          <div className="chips">
            {D.trains.list.map((t) => {
              const on = D.trains.running.has(`${t.station}:${t.no}`)
              return (
                <button
                  key={t.station + t.no}
                  type="button"
                  className={on ? 'chip on' : 'chip click'}
                  onClick={() => markRunning(t, date, user)}
                >
                  {station === 'all' ? `${stationName(t.station)} ` : ''}{t.no}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
