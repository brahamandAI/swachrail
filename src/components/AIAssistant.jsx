import { useEffect, useRef, useState } from 'react'
import { formatDate, localAnswer, stationName } from '../data.js'

const SUGGESTIONS = ['Today summary', 'Trains running', 'Peak days']

export default function AIAssistant({ city, date, D }) {
  const greet = `${stationName(city)} · ${formatDate(date)}: ${D.feedback.t} feedback, ${D.attendance.t} attendance, ${D.photos.t} cleanliness photos.`
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState(() => [{ c: 'a', t: greet }])
  const [q, setQ] = useState('')
  const box = useRef(null)

  useEffect(() => {
    setMsgs([{ c: 'a', t: greet }])
  }, [city, date])

  useEffect(() => {
    const open = () => setOpen(true)
    window.addEventListener('sr-open-ai', open)
    return () => window.removeEventListener('sr-open-ai', open)
  }, [])

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [msgs, open])

  const send = (text) => {
    const t = (text ?? q).trim()
    if (!t) return
    setMsgs((m) => [...m, { t, c: 'u' }, { t: localAnswer(t, D, city), c: 'a' }])
    setQ('')
  }

  return (
    <>
      {open && (
        <div className="ai-panel" role="dialog" aria-label="SwachhRail AI chat">
          <div className="ai-head">
            <b>SwachhRail AI</b>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
          </div>
          <div id="chat" ref={box}>
            {msgs.map((m, i) => (
              <div key={i} className={'m ' + m.c}>{m.t}</div>
            ))}
          </div>
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip click" type="button" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); send() }}>
            <input
              placeholder="Ask about this duty date"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Ask about this duty date"
            />
            <button className="btn" type="submit">Send</button>
          </form>
        </div>
      )}
      <button className={'ai-fab' + (open ? ' on' : '')} type="button" aria-label={open ? 'Close AI chat' : 'Open AI chat'} onClick={() => setOpen((v) => !v)}>
        <span>AI</span>
      </button>
    </>
  )
}
