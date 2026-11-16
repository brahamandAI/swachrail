import { fail } from './http.js'

const COACH_TYPES = ['AC', 'Non-AC', '1A', '2A', '3A', '3E', 'SL', 'CC', 'EC', '2S', 'EV', 'GN']
const QUOTAS = ['GN', 'TQ', 'PT', 'LD', 'HP', 'DF', 'SS', 'FT', 'PH', 'Other']
const PROBLEM_AREAS = [
  'No issue', 'Toilet', 'Washbasin', 'Berth / seat', 'Floor', 'Window', 'Doorway', 'Aisle',
  'Vestibule', 'Dustbin', 'Linen', 'Pantry', 'Drinking water', 'Smell', 'Pest', 'Other',
]
const SHIFTS = ['Start', 'Mid', 'End']
const LEGACY_SHIFTS = { Morning: 'Start', Evening: 'Mid', Night: 'End', 'Start Journey': 'Start', 'Mid Journey': 'Mid', 'End Journey': 'End' }
const DESIGNATIONS = ['Janitor', 'Supervisor']
const DAY_GRADES = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const CLEANING_AREAS = ['Toilet', 'Washbasin', 'Floor', 'Berth / seat', 'Doorway', 'Vestibule', 'Aisle', 'Dustbin', 'Full coach', 'Other']
const RAKE_ITEMS = ['Toilet', 'Washbasin', 'Floor', 'Berth / seat', 'Dustbin', 'Window', 'Door', 'Vestibule']
const GRADE_ITEMS = ['toilet', 'compartment', 'garbage', 'pest', 'behavior']
const LEGACY_GRADE_ITEMS = ['Toilet', 'Washbasin', 'Floor', 'Berth / seat', 'Dustbin', 'Window', 'Doorway', 'Vestibule']
const RATE_VALUES = ['4', '3', '2', '0', '5', '1']

export function cleanUser(username) {
  return String(username || '').trim().toLowerCase()
}

export function requireDate(value, label = 'Choose a duty date.') {
  const date = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400, label)
  return date
}

export function requireStation(value) {
  const station = String(value || '').trim()
  if (!station || station === 'all') fail(400, 'Choose the station.')
  return station
}

export function accountFields({ name, username, password, station }, nameError = 'Enter the staff name.') {
  const cleanName = String(name || '').trim()
  const user = cleanUser(username)
  if (cleanName.length < 2) fail(400, nameError)
  if (user.length < 3) fail(400, 'Username must be at least 3 characters.')
  if (String(password || '').length < 6) fail(400, 'Password must be at least 6 characters.')
  return { name: cleanName, username: user, password: String(password), station: requireStation(station) }
}

function clipText(value, max = 200) {
  return String(value || '').trim().slice(0, max)
}

export function employeeProfileFields(body = {}) {
  const designation = clipText(body.designation || body.profile?.designation, 80)
  if (!designation) fail(400, 'Enter the designation.')
  const profile = {
    employeeId: clipText(body.employeeId || body.profile?.employeeId, 40),
    designation,
    age: clipText(body.age || body.profile?.age, 10),
    photo: String(body.photo || body.profile?.photo || ''),
    fatherName: clipText(body.fatherName || body.profile?.fatherName, 120),
    motherName: clipText(body.motherName || body.profile?.motherName, 120),
    mobile: clipText(body.mobile || body.profile?.mobile, 20),
    dob: clipText(body.dob || body.profile?.dob, 20),
    aadhar: clipText(body.aadhar || body.profile?.aadhar, 20),
    address: clipText(body.address || body.profile?.address, 400),
    reinId: clipText(body.reinId || body.profile?.reinId, 40),
    rakshakId: clipText(body.rakshakId || body.profile?.rakshakId, 40),
    pan: clipText(body.pan || body.profile?.pan, 20),
    policeVer: clipText(body.policeVer || body.profile?.policeVer, 80),
    policeVerDt: clipText(body.policeVerDt || body.profile?.policeVerDt, 40),
    pvc: clipText(body.pvc || body.profile?.pvc, 80),
    pvcCliApplied: clipText(body.pvcCliApplied || body.profile?.pvcCliApplied, 80),
    pvcIssueMonth: clipText(body.pvcIssueMonth || body.profile?.pvcIssueMonth, 40),
    medical: clipText(body.medical || body.profile?.medical, 80),
    medicalIssueMonth: clipText(body.medicalIssueMonth || body.profile?.medicalIssueMonth, 40),
    education: clipText(body.education || body.profile?.education, 120),
    documentStatus: clipText(body.documentStatus || body.profile?.documentStatus, 80),
    accountName: clipText(body.accountName || body.profile?.accountName, 120),
    accountNumber: clipText(body.accountNumber || body.profile?.accountNumber, 40),
    ifsc: clipText(body.ifsc || body.profile?.ifsc, 20),
    status: clipText(body.status || body.profile?.status, 40),
    issueDate: clipText(body.issueDate || body.profile?.issueDate, 20),
    validUptoDate: clipText(body.validUptoDate || body.profile?.validUptoDate, 20),
    validUptoMonth: clipText(body.validUptoMonth || body.profile?.validUptoMonth, 20),
    formateValidUpto: clipText(body.formateValidUpto || body.profile?.formateValidUpto, 40),
    documentLink: clipText(body.documentLink || body.profile?.documentLink, 300),
    notification: clipText(body.notification || body.profile?.notification, 200),
    remarks: clipText(body.remarks || body.profile?.remarks, 800),
  }
  return profile
}

export function feedbackFields(body) {
  const kind = body.kind === 'tte' ? 'tte' : 'passenger'
  const pnr = String(body.pnr || '').replace(/\s/g, '')
  const train = String(body.train || '').trim()
  const areas = Array.isArray(body.areas) ? body.areas.filter((area) => PROBLEM_AREAS.includes(area)) : []
  const pnrSkipped = kind === 'tte' || body.pnrSkipped === true
  if (String(body.name || '').trim().length < 1) fail(400, 'Enter your name.')
  if (pnr && !/^\d{10}$/.test(pnr)) fail(400, 'PNR must be 10 digits.')
  if (!pnrSkipped && !/^\d{10}$/.test(pnr)) fail(400, 'PNR must be 10 digits, or skip this step.')
  if (!/^\d{4,5}$/.test(train)) fail(400, 'Enter a 4 or 5 digit train number.')
  if (!COACH_TYPES.includes(body.coachType)) fail(400, 'Choose the coach type.')
  if (!String(body.coachNo || '').trim()) fail(400, 'Enter the coach number, for example B2 or S4.')
  const resolvedAreas = areas.length ? areas : ['No issue']
  const message = String(body.message || '').trim() || 'Rated cleanliness'
  const incoming = body.grades && typeof body.grades === 'object' ? body.grades : null
  const grades = {}
  if (incoming) {
    const keys = GRADE_ITEMS.some((item) => incoming[item] != null && incoming[item] !== '')
      ? GRADE_ITEMS
      : LEGACY_GRADE_ITEMS.filter((item) => incoming[item] != null && incoming[item] !== '')
    for (const item of keys.length ? keys : GRADE_ITEMS) {
      const value = String(incoming[item] ?? '')
      if (!RATE_VALUES.includes(value)) fail(400, `Select a rating for ${item}.`)
      grades[item] = value
    }
  }
  let rating = String(body.rating || '4')
  if (Object.keys(grades).length) {
    const values = Object.values(grades).map(Number).filter((n) => n > 0)
    rating = values.length ? String(Math.round(values.reduce((sum, n) => sum + n, 0) / values.length)) : '0'
  }
  if (!RATE_VALUES.includes(rating) && !['1', '2', '3', '4', '5'].includes(rating)) fail(400, 'Choose a rating.')
  const dayGrade = String(body.grade || '').trim().toUpperCase()
  if (dayGrade && !DAY_GRADES.includes(dayGrade)) fail(400, 'Choose day grade A–G.')
  return {
    kind,
    name: String(body.name).trim(),
    phone: String(body.phone || '').trim(),
    pnr,
    train,
    coachType: body.coachType,
    coachNo: String(body.coachNo).trim().toUpperCase(),
    berth: String(body.berth || '').trim().toUpperCase(),
    quota: QUOTAS.includes(body.quota) ? body.quota : String(body.quota || '').trim().slice(0, 12),
    janitorName: String(body.janitorName || '').trim(),
    grade: dayGrade || '',
    areas: resolvedAreas,
    grades,
    rating,
    message,
    image: body.image || '',
  }
}

export function attendanceFields(body) {
  if (!String(body.name || '').trim()) fail(400, 'Staff name is required.')
  const shift = LEGACY_SHIFTS[body.shift] || body.shift
  if (!SHIFTS.includes(shift)) fail(400, 'Choose Start Journey, Mid Journey or End Journey.')
  const designation = String(body.designation || 'Janitor').trim()
  if (designation && !DESIGNATIONS.includes(designation)) fail(400, 'Choose Janitor or Supervisor.')
  const grade = String(body.grade || '').trim().toUpperCase()
  if (grade && !DAY_GRADES.includes(grade)) fail(400, 'Choose day grade A–G.')
  const coachType = String(body.coachType || '').trim()
  if (coachType && !COACH_TYPES.includes(coachType)) fail(400, 'Choose the coach type.')
  return {
    name: String(body.name).trim(),
    train: String(body.train || '').trim(),
    shift,
    coachType: coachType || '',
    designation: designation || 'Janitor',
    grade: grade || '',
    image: body.image || '',
  }
}

export function photoFields(body) {
  const before = body.before || body.image || ''
  const after = body.after || ''
  if (!String(body.train || '').trim()) fail(400, 'Train number is required.')
  if (!before && !after) fail(400, 'Take a cleaning photo.')
  const coachType = String(body.coachType || '').trim()
  if (coachType && !COACH_TYPES.includes(coachType)) fail(400, 'Choose the coach type.')
  const grade = String(body.grade || '').trim().toUpperCase()
  if (grade && !DAY_GRADES.includes(grade)) fail(400, 'Choose day grade A–G.')
  const area = String(body.area || '').trim()
  if (area && !CLEANING_AREAS.includes(area) && area.length > 40) fail(400, 'Choose the cleaning area.')
  const janitorName = String(body.janitorName || body.name || '').trim()
  const coachNo = String(body.coachNo || '').trim().toUpperCase()
  const note = String(body.note || '').trim()
    || [coachNo && `Coach ${coachNo}`, area, janitorName && `Janitor ${janitorName}`, grade && `Grade ${grade}`].filter(Boolean).join(' · ')
    || 'Cleaning photo'
  return {
    train: String(body.train).trim(),
    area,
    note,
    coachNo,
    coachType: coachType || '',
    janitorName,
    grade: grade || '',
    before,
    after,
  }
}

export function inspectionFields(body) {
  const train = String(body.train || '').trim()
  const coach = String(body.coach || '').trim().toUpperCase()
  if (!/^\d{4,5}$/.test(train)) fail(400, 'Enter a 4 or 5 digit train number.')
  if (!coach) fail(400, 'Enter the coach number.')
  const checks = {}
  const incoming = body.checks && typeof body.checks === 'object' ? body.checks : {}
  for (const item of RAKE_ITEMS) {
    checks[item] = incoming[item] === 'Not OK' ? 'Not OK' : 'OK'
  }
  return { train, coach, checks, note: String(body.note || '').trim(), image: body.image || '' }
}

export function platformFields(body) {
  const platform = String(body.platform || '').trim()
  if (!platform) fail(400, 'Enter the platform number.')
  if (!String(body.note || '').trim()) fail(400, 'Write what was cleaned.')
  return {
    platform,
    machine: !!body.machine,
    waste: !!body.waste,
    washed: !!body.washed,
    drain: !!body.drain,
    note: String(body.note).trim(),
    image: body.image || '',
  }
}

export function stationCleanFields(body) {
  const areas = ['Platform', 'Waiting hall', 'Toilet', 'Foot over bridge', 'Circulating area', 'Parking']
  if (!areas.includes(body.area)) fail(400, 'Choose the area.')
  if (!String(body.note || '').trim()) fail(400, 'Write what you found.')
  const rating = String(body.rating || '5')
  if (!['1', '2', '3', '4', '5'].includes(rating)) fail(400, 'Choose a rating.')
  return { area: body.area, rating, note: String(body.note).trim(), image: body.image || '' }
}

export function trainNumber(value) {
  const no = String(value || '').trim()
  if (!/^\d{4,6}$/.test(no)) fail(400, 'Enter a 4 to 6 digit train number.')
  return no
}

export function placeOf(body) {
  const lat = body.lat == null || body.lat === '' ? null : Number(body.lat)
  const lng = body.lng == null || body.lng === '' ? null : Number(body.lng)
  const placeName = String(body.placeName || '').trim().slice(0, 160)
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    placeName: placeName || undefined,
  }
}
