import { useEffect, useState } from 'react'
import BrandLogo from './BrandLogo.jsx'

export default function Splash({ ready }) {
  const [hold, setHold] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setHold(false), 1400)
    return () => window.clearTimeout(timer)
  }, [])

  if (ready && !hold) return null

  return (
    <div className="splash" role="status" aria-live="polite" aria-label="Loading Robustrix">
      <BrandLogo className="splash-logo" />
      <p>Robustrix IT Solution Pvt Ltd</p>
    </div>
  )
}
