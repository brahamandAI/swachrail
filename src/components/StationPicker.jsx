import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { slugStation, STATIONS } from '../stations.js'
import { stationName } from '../data.js'

function highlight(name, query) {
  const q = query.trim()
  if (!q) return name
  const i = name.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return name
  return (
    <>
      {name.slice(0, i)}
      <mark>{name.slice(i, i + q.length)}</mark>
      {name.slice(i + q.length)}
    </>
  )
}

export default function StationPicker({ value, onChange, allowAll = false, label = 'Station' }) {
  const inputRef = useRef(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const selected = !value ? '' : value === 'all' ? 'All stations' : stationName(value)

  const items = useMemo(() => {
    const query = q.trim().toLowerCase()
    const base = allowAll ? [{ id: 'all', n: 'All stations' }, ...STATIONS] : STATIONS
    const filtered = query
      ? base.filter((s) => s.n.toLowerCase().includes(query))
      : base
    return filtered.slice(0, 20)
  }, [q, allowAll])
  const typed = q.trim()
  const exact = STATIONS.some((s) => s.n.toLowerCase() === typed.toLowerCase())

  const place = () => {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
  }

  useEffect(() => {
    if (!open) return undefined
    place()
    const move = () => place()
    window.addEventListener('resize', move)
    window.addEventListener('scroll', move, true)
    return () => {
      window.removeEventListener('resize', move)
      window.removeEventListener('scroll', move, true)
    }
  }, [open, q])

  const choose = (id) => {
    onChange(id)
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const menu = open && pos
    ? createPortal(
        <div className="station-menu" style={{ top: pos.top, left: pos.left, width: pos.width }} role="listbox">
          {items.map((s) => (
            <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); choose(s.id) }}>
              {highlight(s.n, typed)}
            </button>
          ))}
          {typed && !exact && (
            <button type="button" onMouseDown={(e) => { e.preventDefault(); choose(slugStation(typed)) }}>
              Use “{typed}”
            </button>
          )}
          {items.length === 0 && !typed && <div className="empty">Type a station name</div>}
        </div>,
        document.body
      )
    : null

  return (
    <label className="field">
      {label}
      <div className="picker">
        <input
          ref={inputRef}
          value={open ? q : selected}
          placeholder="Type station name"
          aria-label={label}
          autoComplete="off"
          onFocus={() => {
            setOpen(true)
            setQ('')
          }}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
        />
        {menu}
      </div>
    </label>
  )
}
