const NAMES = `
Abu Road
Adra
Agartala
Agra Cantt
Ahmedabad
Ajmer
Akola
Alipurduar
Alwar
Ambala Cantt
Amravati
Amritsar
Anand
Anand Vihar
Andal
Ara
Asansol
Aurangabad
Badnera
Balasore
Ballia
Bandikui
Bandra Terminus
Barauni
Barddhaman
Bareilly
Barmer
Basti
Belagavi
Bengaluru
Bhadrak
Bhagalpur
Bharuch
Bhavnagar
Bhopal
Bhuneshwar
Bhuj
Bhusaval
Bikaner
Bilaspur
Bina
Bokaro Steel City
Buxar
Chakradharpur
Chandigarh
Chennai Central
Chennai Egmore
Chhapra
Coimbatore
CSMT Mumbai
Cuttack
Dadar
Danapur
Darbhanga
Davangere
Dehradun
Dehri on Sone
Deoria Sadar
Dhanbad
Dibrugarh
Dimapur
Durg
Durgapur
Dwarka
Ernakulam Junction
Erode
Etawah
Faridabad
Gandhidham
Gaya
Ghaziabad
Gondia
Gonda
Gorakhpur
Guwahati
Guntakal
Guntur
Gwalior
Haridwar
Hassan
Hatia
Hazrat Nizamuddin
Hisar
Howrah
Hubballi
Hyderabad
Igatpuri
Indore
Itarsi
Jabalpur
Jaipur
Jaisalmer
Jalandhar City
Jalgaon
Jammu Tawi
Jasidih
Jhansi
Jhajha
Jodhpur
Jolarpettai
Kacheguda
Kalka
Kalyan
Kannur
Kanpur Central
Kankavali
Karnal
Karwar
Katni
Katpadi
Kazipet
Kharagpur
Khurda Road
Kishanganj
Kiul
Kolhapur
Korba
Kota
Kozhikode
Kurnool City
Lucknow
Ludhiana
Lumding
Madgaon
Madhupur
Madurai
Malda Town
Manmad
Mathura Junction
Mau Junction
Meerut City
Mehsana
Moradabad
Mumbai Central
Muzaffarpur
Mysuru
Nagercoil
Nagda
Nagpur
Nanded
Nasik Road
Nellore
New Delhi
New Jalpaiguri
Okha
Old Delhi
Ongole
Palanpur
Panipat
Patna Junction
Pathankot
Phulera
Porbandar
Prayagraj Junction
Pt Deen Dayal Upadhyaya
Puducherry
Pune
Puri
Purulia
Raipur
Rajkot
Rajnandgaon
Ranchi
Ratlam
Ratnagiri
Raxaul
Renigunta
Rewa
Rewari
Roorkee
Rourkela
Saharanpur
Salem
Sambalpur
Samastipur
Santragachi
Sasaram
Satna
Sawai Madhopur
Sealdah
Secunderabad
Shivamogga
Sikar
Siliguri
Solapur
Sonpur
Surat
Tatanagar
Thane
Thanjavur
Thiruvananthapuram
Thivim
Tiruchirappalli
Tirunelveli
Tirupati
Titlagarh
Tundla
Udaipur City
Udupi
Ujjain
Vadodara
Valsad
Vapi
Varanasi Junction
Vijayawada
Villupuram
Visakhapatnam
Vizianagaram
Warangal
Yesvantpur
`.trim().split('\n')

export function slugStation(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

const seen = new Set()
export const STATIONS = NAMES.map((n) => ({ id: slugStation(n), n: n.trim() }))
  .filter((s) => s.id && !seen.has(s.id) && seen.add(s.id))
  .sort((a, b) => a.n.localeCompare(b.n))

export const CITY = Object.fromEntries(STATIONS.map((s) => [s.id, { n: s.n }]))

export const COACH_TYPES = ['AC', 'Non-AC', '1A', '2A', '3A', '3E', 'SL', 'CC', 'EC', '2S', 'EV', 'GN']

export const FEEDBACK_COACH_TYPES = ['AC', 'Non-AC']

export const QUOTAS = ['GN', 'TQ', 'PT', 'LD', 'HP', 'DF', 'SS', 'FT', 'PH', 'Other']

export const PROBLEM_AREAS = [
  'No issue',
  'Toilet',
  'Washbasin',
  'Berth / seat',
  'Floor',
  'Window',
  'Doorway',
  'Aisle',
  'Vestibule',
  'Dustbin',
  'Linen',
  'Pantry',
  'Drinking water',
  'Smell',
  'Pest',
  'Other',
]

/** OBHS passenger feedback rating questions (English + Hindi). */
export const OBHS_FEEDBACK_ITEMS = [
  {
    id: 'toilet',
    en: 'Cleaning of toilets (including toilet floor, commode pan wall panels, shelf, mirror, wash basin, disinfection and provision of deodorant etc.)',
    hi: 'शौचालयों की सफाई (शामिल है शौचालय का फर्श, कमोड पैन, वाल पैनल, शेल्फ, आइना, वाशबेसिन, कीटाणुरोधक और दुर्गन्ध नाशक का प्रदान करना इत्यादि कार्य)',
  },
  {
    id: 'compartment',
    en: 'Cleaning of passenger compartment (including cleaning of passenger aisle, vestibule area, Doorway area and doorway wash basin, spraying of air freshener and cleaning of dust bin)',
    hi: 'पैसेंजर कम्पार्टमेंट की सफाई (शामिल है, यात्री गलियारे, वेस्टीबलक्षेत्र, द्वारक्षेत्र, और द्वारक्षेत्र के वाशबेसिन की सफाई, एयर रेशनेट का छिड़काव करना और डस्टबिन की सफाई)',
  },
  {
    id: 'garbage',
    en: 'Collection of garbage from the coach compartments and clearance of dustbins',
    hi: 'कोच के हिस्सों से कचरे का संग्रहण और कचरे के डिब्बों को खाली करना',
  },
  {
    id: 'pest',
    en: 'Spraying of Mosquito/Cockroach/ Fly repellent and providing Glue Board whenever required or on demand by passengers',
    hi: 'ज़रूरत पड़ने पर मच्छर / तिलचट्टे / मक्खी मार दवा का छिड़काव और ग्लू बोर्ड को रखना',
  },
  {
    id: 'behavior',
    en: 'Behavior / Response of janitors/ supervisor (including hygiene & cleanliness of janitor/Supervisor)',
    hi: 'सफाई कर्मचारी का व्यवहार ( शामिल है, स्वच्छता और साफ़ सफाई इत्यादि )',
  },
]

export const GRADE_ITEMS = OBHS_FEEDBACK_ITEMS.map((item) => item.id)

export const GRADE_OPTIONS = [
  { value: '4', label: 'Very Good', emoji: '😃' },
  { value: '3', label: 'Satisfactory', emoji: '🙂' },
  { value: '2', label: 'Poor', emoji: '😐' },
  { value: '0', label: 'Not Attended', emoji: '☹️' },
]

export const DUTY_ROUNDS = ['Start', 'Mid', 'End']

export const DUTY_ROUND_LABELS = {
  Start: 'Start Journey',
  Mid: 'Mid Journey',
  End: 'End Journey',
}

export const DESIGNATIONS = ['Janitor', 'Supervisor']

export const CLEANING_AREAS = [
  'Toilet',
  'Washbasin',
  'Floor',
  'Berth / seat',
  'Doorway',
  'Vestibule',
  'Aisle',
  'Dustbin',
  'Full coach',
  'Other',
]

export const DAY_GRADES = [
  { id: 'A', label: 'A - Monday' },
  { id: 'B', label: 'B - Tuesday' },
  { id: 'C', label: 'C - Wednesday' },
  { id: 'D', label: 'D - Thursday' },
  { id: 'E', label: 'E - Friday' },
  { id: 'F', label: 'F - Saturday' },
  { id: 'G', label: 'G - Sunday' },
]

/** Demo coach details derived from PNR digits (same idea as OBHS feedback apps). */
export function detailsFromPnr(pnr) {
  const n = String(pnr || '').replace(/\D/g, '')
  if (n.length !== 10) return { coachNo: '', berth: '', coachType: 'AC' }
  const ac = Number(n[2]) % 2 === 0
  const coachType = ac ? 'AC' : 'Non-AC'
  const prefix = ac ? 'B' : 'S'
  const coachNo = `${prefix}${(Number(n.slice(4, 6)) % 12) + 1}`
  const berth = String((Number(n.slice(7, 9)) % 72) + 1)
  return { coachNo, berth, coachType }
}

export function blankGrades() {
  return Object.fromEntries(GRADE_ITEMS.map((item) => [item, '']))
}

export function averageGrade(grades) {
  const values = GRADE_ITEMS.map((item) => Number(grades?.[item])).filter((n) => Number.isFinite(n) && n > 0)
  if (!values.length) return '0'
  return String(Math.round(values.reduce((sum, n) => sum + n, 0) / values.length))
}

export function todayDayGrade() {
  const day = new Date().getDay()
  return DAY_GRADES[day === 0 ? 6 : day - 1]?.id || 'A'
}
