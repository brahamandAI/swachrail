import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { alertsFor, formatDate, isoDate, scoreCards, stationName } from '../data.js'
import { placeNameFromCoords } from '../geo.js'
import { readPhoto } from '../photo.js'
import { Camera } from './Passenger.jsx'
import { addInspection, addPhoto, addPlatformClean, addStationClean, useDB } from '../store.js'

const RAKE_ITEMS = ['Toilet', 'Washbasin', 'Floor', 'Berth / seat', 'Dustbin', 'Window', 'Door', 'Vestibule']
const STATION_AREAS = ['Platform', 'Waiting hall', 'Toilet', 'Foot over bridge', 'Circulating area', 'Parking']

function Note({ text }) {
  if (!text) return null
  const ok = text.startsWith('Saved')
  return <div className={ok ? 's' : 'err'}>{text}</div>
}

function blankChecks() {
  return Object.fromEntries(RAKE_ITEMS.map((item) => [item, 'OK']))
}

function readPlace() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not available on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = +pos.coords.latitude.toFixed(5)
        const lng = +pos.coords.longitude.toFixed(5)
        const placeName = await placeNameFromCoords(lat, lng)
        resolve({ lat, lng, placeName: placeName || 'Location captured' })
      },
      () => reject(new Error('Location permission was not granted.')),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })
}

function Place({ value, onChange, onError }) {
  const tag = () => {
    readPlace().then(onChange).catch((err) => onError(err.message))
  }
  return (
    <div className="place">
      <button className="btn ghost" type="button" onClick={tag}>Tag location</button>
      {value?.placeName && <span className="s">{value.placeName}</span>}
    </div>
  )
}

function csvCell(value) {
  const text = String(value ?? '').replaceAll('"', '""')
  return `"${text}"`
}

function saveCsv(filename, lines) {
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function weekRange(dateStr) {
  const day = new Date(`${dateStr}T12:00:00`)
  const monday = new Date(day)
  monday.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: isoDate(monday), to: isoDate(sunday) }
}

function monthRange(dateStr) {
  const [year, month] = dateStr.split('-')
  const last = new Date(Number(year), Number(month), 0).getDate()
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(last).padStart(2, '0')}` }
}

function detailOf(r) {
  if (r.type === 'feedback') return `${r.kind === 'tte' ? 'TTE' : 'Passenger'} · ${r.name} · PNR ${r.pnr || 'skipped'} · ${r.coachType} ${r.coachNo} · ${r.rating}/5 · ${r.message}`
  if (r.type === 'attendance') return `${r.name} · ${r.shift}${r.placeName ? ` · ${r.placeName}` : ''}`
  if (r.type === 'inspection') return `Coach ${r.coach} · ${Object.entries(r.checks || {}).map(([k, v]) => `${k} ${v}`).join('; ')}`
  if (r.type === 'platform') return `Platform ${r.platform} · ${r.note}`
  if (r.type === 'station-clean') return `${r.area} · ${r.rating}/5 · ${r.note}`
  return r.note || ''
}

function scoped(records, station, from, to) {
  return records.filter((r) => {
    if (r.type === 'running') return false
    if (station !== 'all' && r.station !== station) return false
    if (from && r.date < from) return false
    if (to && r.date > to) return false
    return true
  })
}

function countOf(list, type) {
  return list.filter((r) => r.type === type).length
}

function averageRating(list) {
  const rated = list.filter((r) => +r.rating)
  if (!rated.length) return ''
  return (rated.reduce((sum, r) => sum + Number(r.rating), 0) / rated.length).toFixed(1)
}

function buildReport({ title, station, from, to, list, running, trains, byMonth }) {
  const inspections = list.filter((r) => r.type === 'inspection')
  let checks = 0
  let pass = 0
  inspections.forEach((r) => {
    Object.values(r.checks || {}).forEach((value) => {
      checks += 1
      if (value === 'OK') pass += 1
    })
  })
  const lines = [
    ['Report', title],
    ['Station', stationName(station)],
    ['From', from ? formatDate(from) : 'First saved record'],
    ['To', to ? formatDate(to) : 'Latest saved record'],
    [],
    ['Metric', 'Count', 'Note'],
    ['Feedback', countOf(list, 'feedback'), averageRating(list.filter((r) => r.type === 'feedback')) ? `Average ${averageRating(list.filter((r) => r.type === 'feedback'))}/5` : ''],
    ['Attendance', countOf(list, 'attendance'), ''],
    ['Photos', countOf(list, 'photo'), ''],
    ['Rake inspections', inspections.length, checks ? `${Math.round((pass / checks) * 100)}% checks OK` : ''],
    ['Platform cleaning', countOf(list, 'platform'), ''],
    ['Station cleanliness', countOf(list, 'station-clean'), averageRating(list.filter((r) => r.type === 'station-clean')) ? `Average ${averageRating(list.filter((r) => r.type === 'station-clean'))}/5` : ''],
    ['Trains marked running', running, ''],
    ['Configured trains', trains, ''],
  ]
  if (byMonth) {
    const months = [...new Set(list.map((r) => r.date.slice(0, 7)))].sort()
    lines.push([], ['Month', 'Feedback', 'Attendance', 'Photos', 'Inspections', 'Platform', 'Station rounds'])
    months.forEach((month) => {
      const inMonth = list.filter((r) => r.date.startsWith(month))
      lines.push([
        month,
        countOf(inMonth, 'feedback'),
        countOf(inMonth, 'attendance'),
        countOf(inMonth, 'photo'),
        countOf(inMonth, 'inspection'),
        countOf(inMonth, 'platform'),
        countOf(inMonth, 'station-clean'),
      ])
    })
  }
  lines.push([], ['Date', 'Type', 'Station', 'Train', 'Detail', 'Entered by', 'Time'])
  ;[...list]
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.at).localeCompare(String(b.at)))
    .forEach((r) => {
      lines.push([
        r.date,
        r.type,
        stationName(r.station),
        r.train || '',
        detailOf(r),
        r.byName || '',
        r.at ? new Date(r.at).toLocaleString('en-IN') : '',
      ])
    })
  return lines.map((row) => (row.length ? row.map(csvCell).join(',') : ''))
}

export default function AdminModules({ user, date, station, fileStation, view = 'all' }) {
  const db = useDB()
  const meta = { station: fileStation, date, by: user.id, byName: user.name }
  const alerts = alertsFor(db.records, station, date)
  const cards = scoreCards(db.records, db.trains, station, date)
  const week = weekRange(date)
  const month = monthRange(date)
  const weekList = scoped(db.records, station, week.from, week.to)
  const monthList = scoped(db.records, station, month.from, month.to)
  const allList = scoped(db.records, station)
  const ordered = [...allList].sort((a, b) => a.date.localeCompare(b.date))
  const fullFrom = ordered[0]?.date || ''
  const fullTo = ordered.at(-1)?.date || ''
  const trains = station === 'all'
    ? Object.values(db.trains).reduce((sum, list) => sum + (list?.length || 0), 0)
    : (db.trains[station] || []).length
  const runningIn = (from, to) => db.records.filter((r) => r.type === 'running' && (station === 'all' || r.station === station) && (!from || r.date >= from) && (!to || r.date <= to)).length

  const download = (title, filename, list, from, to, byMonth) => {
    saveCsv(filename, buildReport({
      title,
      station,
      from,
      to,
      list,
      running: runningIn(from, to),
      trains,
      byMonth,
    }))
  }

  const [rake, setRake] = useState({ train: '', coach: '', note: '', image: '', checks: blankChecks(), place: null })
  const [plat, setPlat] = useState({ platform: '', machine: true, waste: true, washed: false, drain: false, note: '', image: '', place: null })
  const [round, setRound] = useState({ area: 'Platform', rating: '5', note: '', image: '', place: null })
  const [photo, setPhoto] = useState({ train: '', area: '', note: '', before: '', after: '', place: null })
  const [rakeMsg, setRakeMsg] = useState('')
  const [photoMsg, setPhotoMsg] = useState('')
  const [platMsg, setPlatMsg] = useState('')
  const [roundMsg, setRoundMsg] = useState('')
  const [qr, setQr] = useState('')

  useEffect(() => {
    const url = `${window.location.origin}${window.location.pathname}#feedback`
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#07131f', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [])

  const shot = (setter, key = 'image', setError = setRakeMsg) => (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    readPhoto(file).then((image) => setter((prev) => ({ ...prev, [key]: image }))).catch((err) => setError(err.message))
  }

  const submitPhoto = async (e) => {
    e.preventDefault()
    const error = await addPhoto({ ...meta, ...photo, lat: photo.place?.lat, lng: photo.place?.lng, placeName: photo.place?.placeName })
    setPhotoMsg(error || 'Saved on ' + formatDate(date) + '.')
    if (!error) setPhoto({ train: '', area: '', note: '', before: '', after: '', place: null })
  }

  const submitRake = async (e) => {
    e.preventDefault()
    const error = await addInspection({ ...meta, ...rake, lat: rake.place?.lat, lng: rake.place?.lng, placeName: rake.place?.placeName })
    setRakeMsg(error || 'Saved on ' + formatDate(date) + '.')
    if (!error) setRake({ train: '', coach: '', note: '', image: '', checks: blankChecks(), place: null })
  }

  const submitPlatform = async (e) => {
    e.preventDefault()
    const error = await addPlatformClean({ ...meta, ...plat, lat: plat.place?.lat, lng: plat.place?.lng, placeName: plat.place?.placeName })
    setPlatMsg(error || 'Saved on ' + formatDate(date) + '.')
    if (!error) setPlat({ platform: '', machine: true, waste: true, washed: false, drain: false, note: '', image: '', place: null })
  }

  const submitRound = async (e) => {
    e.preventDefault()
    const error = await addStationClean({ ...meta, ...round, lat: round.place?.lat, lng: round.place?.lng, placeName: round.place?.placeName })
    setRoundMsg(error || 'Saved on ' + formatDate(date) + '.')
    if (!error) setRound({ area: 'Platform', rating: '5', note: '', image: '', place: null })
  }

  const show = (name) => view === 'all' || view === name

  return (
    <section id="modules">
      {view === 'all' && (
        <>
          <h2>Admin panel · {formatDate(date)}</h2>
          <p className="sub">{stationName(station)} · score cards, inspections, alerts and the passenger QR</p>
        </>
      )}

      {(show('scores') || show('alerts')) && (
      <div className="two">
        {show('scores') && (
        <div className="card flat">
          <div className="k">Score cards</div>
          {cards.length === 0 ? (
            <p className="empty">Add a train or save a duty record to see a score.</p>
          ) : (
            <table className="score-table">
              <thead>
                <tr><th>Train</th><th>Score</th><th>Rating</th><th>Rake</th><th>Photos</th></tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.no}>
                    <td>{card.no}</td>
                    <td>{card.score == null ? '—' : `${card.score}%`}</td>
                    <td>{card.avg == null ? '—' : card.avg.toFixed(1)}</td>
                    <td>{card.passPct == null ? '—' : `${card.passPct}%`}</td>
                    <td>{card.photos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        )}
        {show('alerts') && (
        <div className="card flat">
          <div className="k">Alerts</div>
          {alerts.length === 0 ? (
            <p className="empty">No low ratings, failed checks, or running trains without attendance.</p>
          ) : (
            alerts.map((alert) => (
              <p key={alert.text} className={alert.level === 'bad' ? 'alert bad' : 'alert'}>{alert.text}</p>
            ))
          )}
        </div>
        )}
      </div>
      )}

      {show('reports') && (
      <div className="card flat" style={{ marginTop: 14 }}>
        <div className="k">Reports</div>
        <p className="empty">Weekly, monthly, and full summary files for {stationName(station)}. Photos stay on this device.</p>
        <div className="report-actions">
          <button className="btn ghost" type="button" onClick={() => download('Weekly report', `swachhrail-weekly-${week.from}-to-${week.to}.csv`, weekList, week.from, week.to)}>
            Weekly report
          </button>
          <button className="btn ghost" type="button" onClick={() => download('Monthly report', `swachhrail-monthly-${date.slice(0, 7)}.csv`, monthList, month.from, month.to)}>
            Monthly report
          </button>
          <button className="btn ghost" type="button" onClick={() => download('Full summary', `swachhrail-full-summary-${station}.csv`, allList, fullFrom, fullTo, true)}>
            Full summary
          </button>
        </div>
        <p className="s">This week {formatDate(week.from)} – {formatDate(week.to)} · {weekList.length} records · This month {monthList.length} · All saved {allList.length}</p>
      </div>
      )}

      {(show('photos') || show('rake') || show('platform') || show('station') || show('qr')) && (
      <div className="grid">
        {show('photos') && (
        <form className="card" onSubmit={submitPhoto}>
          <div className="k">Before and after photos</div>
          <label className="field">Train number<input value={photo.train} onChange={(e) => setPhoto({ ...photo, train: e.target.value })} required /></label>
          <label className="field">Coach or area<input value={photo.area} onChange={(e) => setPhoto({ ...photo, area: e.target.value })} /></label>
          <label className="field">Note<input value={photo.note} onChange={(e) => setPhoto({ ...photo, note: e.target.value })} required /></label>
          <div className="k">Before photo</div>
          <Camera cameraOnly onShot={(image) => setPhoto((prev) => ({ ...prev, before: image }))} onError={setPhotoMsg} />
          <div className="k">After photo</div>
          <Camera cameraOnly onShot={(image) => setPhoto((prev) => ({ ...prev, after: image }))} onError={setPhotoMsg} />
          <div className="pair">
            {photo.before && <img className="shot" src={photo.before} alt="Before cleaning" />}
            {photo.after && <img className="shot" src={photo.after} alt="After cleaning" />}
          </div>
          <Place value={photo.place} onChange={(place) => setPhoto({ ...photo, place })} onError={setPhotoMsg} />
          <button className="btn" type="submit">Save photo audit</button>
          <Note text={photoMsg} />
        </form>
        )}

        {show('rake') && (
        <form className="card" onSubmit={submitRake}>
          <div className="k">Rake inspection</div>
          <label className="field">Train number<input value={rake.train} onChange={(e) => setRake({ ...rake, train: e.target.value })} /></label>
          <label className="field">Coach<input value={rake.coach} onChange={(e) => setRake({ ...rake, coach: e.target.value })} placeholder="B2" /></label>
          {RAKE_ITEMS.map((item) => (
            <div className="check-row" key={item}>
              <span>{item}</span>
              <select
                value={rake.checks[item]}
                onChange={(e) => setRake({ ...rake, checks: { ...rake.checks, [item]: e.target.value } })}
              >
                <option>OK</option>
                <option>Not OK</option>
              </select>
            </div>
          ))}
          <label className="field">Note<input value={rake.note} onChange={(e) => setRake({ ...rake, note: e.target.value })} /></label>
          <label className="field">Photo<input type="file" accept="image/*" onChange={shot(setRake)} /></label>
          {rake.image && <img className="shot" src={rake.image} alt="Rake inspection" />}
          <Place value={rake.place} onChange={(place) => setRake({ ...rake, place })} onError={setRakeMsg} />
          <button className="btn" type="submit">Save rake inspection</button>
          <Note text={rakeMsg} />
        </form>
        )}

        {show('platform') && (
        <form className="card" onSubmit={submitPlatform}>
          <div className="k">Platform mechanized cleaning</div>
          <label className="field">Platform<input value={plat.platform} onChange={(e) => setPlat({ ...plat, platform: e.target.value })} placeholder="1" /></label>
          {[
            ['machine', 'Machine used'],
            ['waste', 'Waste cleared'],
            ['washed', 'Washed with water'],
            ['drain', 'Drain cleared'],
          ].map(([key, label]) => (
            <label className="check-row" key={key}>
              <span>{label}</span>
              <input type="checkbox" checked={plat[key]} onChange={(e) => setPlat({ ...plat, [key]: e.target.checked })} />
            </label>
          ))}
          <label className="field">Note<input value={plat.note} onChange={(e) => setPlat({ ...plat, note: e.target.value })} /></label>
          <label className="field">Photo<input type="file" accept="image/*" onChange={shot(setPlat)} /></label>
          {plat.image && <img className="shot" src={plat.image} alt="Platform cleaning" />}
          <Place value={plat.place} onChange={(place) => setPlat({ ...plat, place })} onError={setPlatMsg} />
          <button className="btn" type="submit">Save platform round</button>
          <Note text={platMsg} />
        </form>
        )}

        {show('station') && (
        <form className="card" onSubmit={submitRound}>
          <div className="k">Station cleanliness</div>
          <label className="field">
            Area
            <select value={round.area} onChange={(e) => setRound({ ...round, area: e.target.value })}>
              {STATION_AREAS.map((area) => <option key={area}>{area}</option>)}
            </select>
          </label>
          <label className="field">
            Rating
            <select value={round.rating} onChange={(e) => setRound({ ...round, rating: e.target.value })}>
              <option value="5">5 Excellent</option>
              <option value="4">4 Good</option>
              <option value="3">3 Average</option>
              <option value="2">2 Poor</option>
              <option value="1">1 Bad</option>
            </select>
          </label>
          <label className="field">What you found<input value={round.note} onChange={(e) => setRound({ ...round, note: e.target.value })} /></label>
          <label className="field">Photo<input type="file" accept="image/*" onChange={shot(setRound)} /></label>
          {round.image && <img className="shot" src={round.image} alt="Station cleanliness" />}
          <Place value={round.place} onChange={(place) => setRound({ ...round, place })} onError={setRoundMsg} />
          <button className="btn" type="submit">Save station round</button>
          <Note text={roundMsg} />
        </form>
        )}

        {show('qr') && (
        <div className="card flat">
          <div className="k">Passenger feedback QR</div>
          <p className="empty">Print this for the coach or platform. Passengers open the public feedback page.</p>
          {qr && <img className="qr" src={qr} alt="QR code for passenger feedback" />}
          <p className="s">{window.location.origin}{window.location.pathname}#feedback</p>
        </div>
        )}
      </div>
      )}
    </section>
  )
}
