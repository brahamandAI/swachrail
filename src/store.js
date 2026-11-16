import { useEffect, useState } from 'react'

const empty = () => ({
  users: [],
  records: [],
  trains: {},
  session: null,
  ready: false,
  error: '',
  needsSetup: false,
})

let mem = empty()
const listeners = new Set()
let loading = null

function emit(next) {
  mem = next
  listeners.forEach((fn) => fn(mem))
}

function applyServer(data) {
  emit({
    users: data.users || [],
    records: data.records || [],
    trains: data.trains || {},
    session: data.user ? { userId: data.user.id, date: data.dutyDate } : null,
    ready: true,
    error: '',
    needsSetup: !!data.needsSetup,
  })
}

async function readBody(res) {
  return res.json().catch(() => ({}))
}

export async function refresh() {
  try {
    const res = await fetch('/api/state', { credentials: 'include', headers: { Accept: 'application/json' } })
    const data = await readBody(res)
    if (!res.ok) {
      emit({ ...empty(), ready: true, error: data.error || 'Could not load records.' })
      return
    }
    applyServer(data)
  } catch {
    emit({ ...empty(), ready: true, error: 'Could not reach the server.' })
  }
}

function ensureLoaded() {
  if (mem.ready) return Promise.resolve()
  if (!loading) loading = refresh().finally(() => { loading = null })
  return loading
}

async function post(url, body, method = 'POST') {
  let res
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-SwachhRail': '1' },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    return 'Could not reach the server.'
  }
  const data = await readBody(res)
  if (!res.ok) return data.error || 'Request failed.'
  if (data.state) applyServer(data.state)
  return ''
}

export function useDB() {
  const [db, setDb] = useState(mem)
  useEffect(() => {
    listeners.add(setDb)
    setDb(mem)
    ensureLoaded()
    return () => listeners.delete(setDb)
  }, [])
  return db
}

export function setupAdmin(fields) {
  return post('/api/setup', fields)
}

export function login(fields) {
  return post('/api/login', fields)
}

export function logout() {
  return post('/api/logout', {})
}

export function setDutyDate(date) {
  return post('/api/duty', { date })
}

export function addStaff(fields) {
  return post('/api/staff', fields)
}

export function removeStaff(id) {
  return post(`/api/staff?id=${encodeURIComponent(id)}`, {}, 'DELETE')
}

export function updateAccess(fields) {
  return post('/api/access', fields)
}

export function updateRecord(fields) {
  return post('/api/record', fields)
}

export function removeRecord(id) {
  return post(`/api/record?id=${encodeURIComponent(id)}`, {}, 'DELETE')
}

export function removeTrain(station, number) {
  return post(`/api/trains?station=${encodeURIComponent(station)}&number=${encodeURIComponent(number)}`, {}, 'DELETE')
}

export function addFeedback(fields) {
  return post('/api/feedback', fields)
}

export function addAttendance(fields) {
  return post('/api/attendance', fields)
}

export function addPhoto(fields) {
  return post('/api/photo', fields)
}

export function addInspection(fields) {
  return post('/api/inspection', fields)
}

export function addPlatformClean(fields) {
  return post('/api/platform', fields)
}

export function addStationClean(fields) {
  return post('/api/station-clean', fields)
}

export function addTrain(station, number) {
  return post('/api/trains', { station, number })
}

export function toggleRunning(fields) {
  return post('/api/running', fields)
}
