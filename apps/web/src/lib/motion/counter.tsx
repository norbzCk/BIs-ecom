import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/* -------------------------------------------------------------------------- */
/*  Counter — animates a number up when scrolled into view.                    */
/* -------------------------------------------------------------------------- */

export function Counter({
  to,
  from = 0,
  duration = 2,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  className,
}: {
  to: number
  from?: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  separator?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const [value, setValue] = useState(from)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setValue(to)
      return
    }
    const controls = animate(from, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
    })
    return () => controls.stop()
  }, [inView, from, to, duration, reduce])

  const [whole = '', fraction] = value.toFixed(decimals).split('.')
  const grouped = separator ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : whole

  return (
    <span ref={ref} className={className}>
      {prefix}
      {grouped}
      {fraction ? `.${fraction}` : ''}
      {suffix}
    </span>
  )
}
