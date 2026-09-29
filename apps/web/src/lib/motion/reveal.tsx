import { motion, useReducedMotion, type Variants } from 'motion/react'
import { createElement, type ElementType, type ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/*  Shared spring/easing vocabulary                                            */
/* -------------------------------------------------------------------------- */

export const EASE_EXPO = [0.16, 1, 0.3, 1] as const
export const SPRING_SOFT = { type: 'spring', stiffness: 220, damping: 30, mass: 0.9 } as const
export const SPRING_SNAP = { type: 'spring', stiffness: 420, damping: 26, mass: 0.6 } as const

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 34 },
  down: { x: 0, y: -34 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
  none: { x: 0, y: 0 },
}

/**
 * motion.create() builds a new component each call. Caching by tag means the
 * identity is stable across renders, so React keeps the subtree's state
 * instead of remounting it.
 */
const MOTION_TAGS = new Map<ElementType, ElementType>()

function motionTag(as: ElementType): ElementType {
  const cached = MOTION_TAGS.get(as)
  if (cached) return cached
  const created = motion.create(as as ElementType)
  MOTION_TAGS.set(as, created)
  return created
}

/* -------------------------------------------------------------------------- */
/*  Reveal — fades + slides its children in the first time they enter the     */
/*  viewport. Wraps any element and keeps a single observer for the subtree.  */
/* -------------------------------------------------------------------------- */

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  from?: Direction
  scale?: number
  blur?: boolean
  once?: boolean
  amount?: number
  as?: ElementType
  style?: React.CSSProperties
  id?: string
}

export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.8,
  from = 'up',
  scale,
  blur = true,
  once = true,
  amount = 0.25,
  as = 'div',
  style,
  id,
}: RevealProps) {
  const reduce = useReducedMotion()
  const { x, y } = OFFSET[from]

  if (reduce) {
    const Tag = as as ElementType
    return (
      <Tag className={className} style={style} id={id}>
        {children}
      </Tag>
    )
  }

  return createElement(
    motionTag(as),
    {
      id,
      className,
      style,
      initial: {
        opacity: 0,
        x,
        y,
        scale: scale ?? 1,
        filter: blur ? 'blur(10px)' : 'none',
      },
      whileInView: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
      viewport: { once, amount },
      transition: { duration, delay, ease: EASE_EXPO },
    },
    children,
  )
}

/* -------------------------------------------------------------------------- */
/*  Stagger — parent that cascades its StaggerItem children on scroll-in.      */
/* -------------------------------------------------------------------------- */

export const staggerParent = (stagger = 0.07, delayChildren = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
})

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 26, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: EASE_EXPO },
  },
}

interface StaggerProps {
  children: ReactNode
  className?: string
  stagger?: number
  delayChildren?: number
  amount?: number
  once?: boolean
  as?: ElementType
}

export function Stagger({
  children,
  className,
  stagger = 0.07,
  delayChildren = 0,
  amount = 0.15,
  once = true,
  as = 'div',
}: StaggerProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    const Tag = as as ElementType
    return <Tag className={className}>{children}</Tag>
  }

  return createElement(
    motionTag(as),
    {
      className,
      variants: staggerParent(stagger, delayChildren),
      initial: 'hidden',
      whileInView: 'show',
      viewport: { once, amount },
    },
    children,
  )
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: ElementType
}) {
  const reduce = useReducedMotion()

  if (reduce) {
    const Tag = as as ElementType
    return <Tag className={className}>{children}</Tag>
  }

  return createElement(motionTag(as), { className, variants: staggerChild }, children)
}

/* -------------------------------------------------------------------------- */
/*  SplitWords — per-word masked slide-up, for hero headlines.                 */
/* -------------------------------------------------------------------------- */

export function SplitWords({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.055,
  as: Tag = 'span',
}: {
  text: string
  className?: string
  wordClassName?: string
  delay?: number
  stagger?: number
  as?: ElementType
}) {
  const reduce = useReducedMotion()
  const words = text.split(' ')

  if (reduce) {
    return <Tag className={className}>{text}</Tag>
  }

  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden align-bottom"
          style={{ paddingBottom: '0.12em', marginBottom: '-0.12em' }}
        >
          <motion.span
            className={`inline-block ${wordClassName ?? ''}`}
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              duration: 1,
              delay: delay + i * stagger,
              ease: EASE_EXPO,
            }}
          >
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
