import { motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/*  Marquee — seamless infinite horizontal rail (content is duplicated once).  */
/* -------------------------------------------------------------------------- */

export function Marquee({
  children,
  speed = 38,
  reverse = false,
  className = '',
  pauseOnHover = true,
}: {
  children: ReactNode
  speed?: number
  reverse?: boolean
  className?: string
  pauseOnHover?: boolean
}) {
  const reduce = useReducedMotion()
  const [paused, setPaused] = useState(false)

  return (
    <div
      className={`mask-fade-x group relative overflow-hidden ${className}`}
      onPointerEnter={() => pauseOnHover && setPaused(true)}
      onPointerLeave={() => pauseOnHover && setPaused(false)}
    >
      <div
        className="flex w-max"
        style={{
          animation: reduce
            ? undefined
            : `marquee ${speed}s linear infinite${reverse ? ' reverse' : ''}`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SectionHeading — eyebrow + title + lede, animated in on scroll.           */
/* -------------------------------------------------------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  action,
  className = '',
}: {
  eyebrow?: string
  title: ReactNode
  lede?: ReactNode
  align?: 'left' | 'center'
  action?: ReactNode
  className?: string
}) {
  const centered = align === 'center'

  return (
    <div
      className={`flex flex-col gap-4 ${
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'
      } ${className}`}
    >
      <div className={centered ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && (
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="eyebrow"
          >
            <span className="size-1.5 rounded-full bg-accent-400 shadow-[0_0_8px_var(--color-accent-400)]" />
            {eyebrow}
          </motion.span>
        )}

        <motion.h2
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 text-2xl font-bold text-balance sm:text-3xl lg:text-4xl"
        >
          {title}
        </motion.h2>

        {lede && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base"
          >
            {lede}
          </motion.p>
        )}
      </div>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0"
        >
          {action}
        </motion.div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Skeleton — shimmering placeholder block.                                    */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} aria-hidden />
}
