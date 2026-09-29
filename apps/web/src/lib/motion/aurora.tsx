import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'

/* -------------------------------------------------------------------------- */
/*  Aurora — slow-drifting colour blobs behind a grid. The hero backdrop.      */
/* -------------------------------------------------------------------------- */

interface Blob {
  id: string
  size: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  delay: string
  anim: string
  from: string
  to: string
}

const BLOBS: Blob[] = [
  {
    id: 'a',
    size: 46,
    top: '-14%',
    left: '-6%',
    delay: '0s',
    anim: 'animate-drift-a',
    from: '#5b76ff',
    to: '#14b8d4',
  },
  {
    id: 'b',
    size: 40,
    top: '-4%',
    right: '-8%',
    delay: '-6s',
    anim: 'animate-drift-b',
    from: '#7c3aed',
    to: '#5b76ff',
  },
  {
    id: 'c',
    size: 34,
    bottom: '-22%',
    left: '32%',
    delay: '-11s',
    anim: 'animate-drift-c',
    from: '#0ea5e9',
    to: '#5b76ff',
  },
]

export function Aurora({ className = '', opacity = 1 }: { className?: string; opacity?: number }) {
  const reduce = useReducedMotion()

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity }}
    >
      {BLOBS.map((blob) => (
        <div
          key={blob.id}
          className={`absolute rounded-full blur-[90px] ${reduce ? '' : blob.anim}`}
          style={{
            width: `${blob.size}vw`,
            height: `${blob.size}vw`,
            top: blob.top,
            left: blob.left,
            right: blob.right,
            bottom: blob.bottom,
            background: `radial-gradient(circle at 30% 30%, ${blob.from} 0%, ${blob.to} 45%, transparent 72%)`,
          }}
        />
      ))}

      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000,transparent)]" />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  ParticleField — deterministic drifting dots, canvas-free.                   */
/* -------------------------------------------------------------------------- */

export function ParticleField({ count = 26 }: { count?: number }) {
  const reduce = useReducedMotion()
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: (i * 37.7) % 100,
        top: (i * 61.3) % 100,
        size: 1 + ((i * 7) % 3),
        delay: (i % 9) * 0.7,
        duration: 5 + ((i * 3) % 6),
      })),
    [count],
  )

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((dot) => (
        <span
          key={dot.id}
          className="absolute rounded-full bg-white/45"
          style={{
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            width: dot.size,
            height: dot.size,
            animation: reduce
              ? undefined
              : `float-slow ${dot.duration}s ease-in-out ${dot.delay}s infinite`,
            boxShadow: '0 0 8px rgb(255 255 255 / 0.55)',
          }}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  ConicHalo — rotating conic gradient ring, used behind feature cards.       */
/* -------------------------------------------------------------------------- */

export function ConicHalo({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -inset-px overflow-hidden rounded-[inherit] ${className}`}
    >
      <div
        className="absolute -inset-[200%] opacity-40 blur-2xl"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, #5b76ff 70deg, #38d6ee 130deg, transparent 200deg, transparent 360deg)',
          animation: 'spin 6s linear infinite',
        }}
      />
    </div>
  )
}

export function FloatingBadge({
  children,
  className = '',
  delay = 0,
  float = true,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  float?: boolean
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={float ? { animation: `float-slow 6s ease-in-out ${delay}s infinite` } : undefined}
    >
      {children}
    </motion.div>
  )
}
