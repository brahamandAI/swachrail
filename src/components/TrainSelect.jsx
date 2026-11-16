import { useState } from 'react'
import { useDB } from '../store.js'

export function stationTrains(trains, station, extra = []) {
  const configured = !station || station === 'all'
    ? Object.values(trains || {}).flat()
    : (trains?.[station] || [])
  return [...new Set([
    ...configured.map(String),
    ...extra.map((item) => String(item || '')).filter(Boolean),
  ])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

export default function TrainSelect({
  station,
  value = '',
  onChange,
  label = 'Train Number',
  required = false,
  allowAll = false,
  extra = [],
  placeholder = 'Select train number',
}) {
  const { trains, records } = useDB()
  const [other, setOther] = useState(false)
  const fromRecords = (records || [])
    .filter((r) => r.train && (!station || station === 'all' || r.station === station))
    .map((r) => r.train)
  const list = stationTrains(trains, station, [...extra, ...fromRecords])
  const inList = list.includes(String(value))
  const showOther = other || (value && !inList) || list.length === 0

  return (
    <label className="field">
      {label}
      {list.length > 0 && (
        <select
          value={showOther ? '__other__' : value}
          onChange={(e) => {
            const next = e.target.value
            if (next === '__other__') {
              setOther(true)
              if (inList) onChange('')
              return
            }
            setOther(false)
            onChange(next)
          }}
          required={required && !showOther}
        >
          {allowAll && <option value="">All Trains</option>}
          {!allowAll && <option value="">{placeholder}</option>}
          {list.map((no) => <option key={no} value={no}>{no}</option>)}
          <option value="__other__">Other</option>
        </select>
      )}
      {showOther && (
        <input
          style={{ marginTop: list.length ? 8 : 0 }}
          value={value}
          inputMode="numeric"
          placeholder="Enter train number"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required={required}
        />
      )}
      {list.length === 0 && (
        <span className="empty" style={{ display: 'block', marginTop: 6 }}>
          Add trains in View Employee so they appear in this dropdown.
        </span>
      )}
    </label>
  )
}
