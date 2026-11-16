import { useEffect, useState } from 'react'

// Animated count-up from 0 to `target`
export function useCountUp(target) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let s = 0
    let raf
    const step = () => {
      s += target / 50
      if (s < target) {
        setVal(Math.floor(s))
        raf = requestAnimationFrame(step)
      } else setVal(target)
    }
    step()
    return () => cancelAnimationFrame(raf)
  }, [target])
  return val
}
