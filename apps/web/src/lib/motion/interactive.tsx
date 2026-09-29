import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'motion/react'
import { useRef, type ReactNode, type PointerEvent } from 'react'

/* -------------------------------------------------------------------------- */
/*  Magnetic — element leans toward the cursor inside a radius.                 */
/* -------------------------------------------------------------------------- */

export function Magnetic({
  children,
  strength = 0.35,
  radius = 1.6,
  className,
}: {
  children: ReactNode
  strength?: number
  radius?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 260, damping: 18, mass: 0.4 })
  const y = useSpring(my, { stiffness: 260, damping: 18, mass: 0.4 })

  if (reduce) {
    return <span className={className}>{children}</span>
  }

  const handleMove = (e: PointerEvent<HTMLSpanElement>) => {
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const relX = e.clientX - (rect.left + rect.width / 2)
    const relY = e.clientY - (rect.top + rect.height / 2)
    mx.set(relX * strength * radius)
    my.set(relY * strength * radius)
  }

  const reset = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ x, y, display: 'inline-flex' }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
    </motion.span>
  )
}

/* -------------------------------------------------------------------------- */
/*  TiltCard — 3D perspective tilt + glare that tracks the pointer.             */
/* -------------------------------------------------------------------------- */

export function TiltCard({
  children,
  className,
  max = 9,
  glare = true,
  scale = 1.015,
}: {
  children: ReactNode
  className?: string
  max?: number
  glare?: boolean
  scale?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const hover = useMotionValue(0)

  const spring = { stiffness: 180, damping: 20, mass: 0.5 }
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring)
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring)
  const s = useSpring(useTransform(hover, [0, 1], [1, scale]), spring)

  // Glare position as a percentage string for the gradient centre.
  const glareX = useTransform(px, (v) => `${v * 100}%`)
  const glareY = useTransform(py, (v) => `${v * 100}%`)
  const glareOpacity = useSpring(useTransform(hover, [0, 1], [0, 0.16]), spring)
  const glareBg: MotionValue<string> = useTransform(
    [glareX, glareY],
    ([x, y]) =>
      `radial-gradient(420px circle at ${x} ${y}, rgba(255,255,255,0.9), transparent 62%)`,
  )

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX, rotateY, scale: s, transformPerspective: 1100 }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        px.set((e.clientX - rect.left) / rect.width)
        py.set((e.clientY - rect.top) / rect.height)
      }}
      onPointerEnter={() => hover.set(1)}
      onPointerLeave={() => {
        hover.set(0)
        px.set(0.5)
        py.set(0.5)
      }}
    >
      {children}
      {glare && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
          style={{ backgroundImage: glareBg, opacity: glareOpacity }}
        />
      )}
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Spotlight — soft light that follows the cursor across a section.           */
/* -------------------------------------------------------------------------- */

export function Spotlight({
  className = '',
  color = 'rgba(91,118,255,0.16)',
  size = 520,
}: {
  className?: string
  color?: string
  size?: number
}) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(50)
  const my = useMotionValue(50)
  const sx = useSpring(mx, { stiffness: 90, damping: 22 })
  const sy = useSpring(my, { stiffness: 90, damping: 22 })
  const background = useTransform(
    [sx, sy],
    ([x, y]: string[]) =>
      `radial-gradient(${size}px circle at ${x} ${y}, ${color}, transparent 70%)`,
  )

  if (reduce) return null

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ backgroundImage: background }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        mx.set(((e.clientX - rect.left) / rect.width) * 100)
        my.set(((e.clientY - rect.top) / rect.height) * 100)
      }}
    />
  )
}
