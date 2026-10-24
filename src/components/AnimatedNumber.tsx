import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (n: number) => string
  duration?: number
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export default function AnimatedNumber({ value, format, duration = 600 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return

    let raf = 0
    let start: number | null = null

    function tick(timestamp: number) {
      if (start === null) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = easeOutCubic(progress)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <>{format(display)}</>
}
