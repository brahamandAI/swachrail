import { useMemo, useState } from 'react'

const PRODUCTS = [
  { title: 'SwachhRail Feedback', text: 'Passenger and TTE feedback, grading, photos and attendance.', href: '#feedback', label: 'App', icon: '◉' },
  { title: 'Cleanliness board', text: 'Public counts and feedback already sent for a station.', href: '#board', icon: '▦' },
  { title: 'Attendance', text: 'Staff sign in, then mark Start / Mid / End duty attendance.', href: '#staff', icon: '◔' },
  { title: 'Photo report', text: 'Cleanliness photos on the duty console.', href: '#staff', icon: '▣' },
  { title: 'Rake inspection', text: 'Coach checklist and inspection photos in admin.', href: '#admin', icon: '⌁' },
  { title: 'Platform cleaning', text: 'Platform cleaning records in the admin panel.', href: '#admin', icon: '△' },
  { title: 'Station cleanliness', text: 'Station area rounds and ratings.', href: '#admin', icon: '⌂' },
  { title: 'Score cards', text: 'Train scores and performance cards.', href: '#admin', icon: '◔' },
  { title: 'Reports', text: 'Weekly, monthly and full summary downloads.', href: '#admin', icon: '▤' },
  { title: 'Admin panel', text: 'Official admin login, crew, QR and tools.', href: '#admin', icon: '◆' },
]

export default function Portal() {
  const [query, setQuery] = useState('')
  const cards = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PRODUCTS
    return PRODUCTS.filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(q))
  }, [query])

  return (
    <section className="portal beatle-portal">
      <p className="k">Select a platform</p>
      <h1>Choose a product to access your dashboard.</h1>
      <label className="field portal-search">
        Search
        <input value={query} placeholder="Search products…" onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="portal-grid">
        {cards.map((item) => (
          <a key={item.title} className={item.label ? 'card link-card portal-app' : 'card link-card'} href={item.href}>
            <span className="portal-ico" aria-hidden="true">{item.icon}</span>
            <div className="k">{item.label || 'Website'}</div>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
            <b className="portal-arrow" aria-hidden="true">→</b>
          </a>
        ))}
        {cards.length === 0 && <p className="empty">No product matches that search.</p>}
      </div>
    </section>
  )
}
