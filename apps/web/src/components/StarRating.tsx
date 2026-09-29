import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'

export function StarRating({
  rating,
  reviewCount,
  size = 'sm',
  showValue = true,
  className = '',
}: {
  rating: number
  reviewCount?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const [hovered, setHovered] = useState<number | null>(null)

  const dims = {
    sm: { star: 'size-3.5', text: 'text-xs' },
    md: { star: 'size-4', text: 'text-sm' },
    lg: { star: 'size-5', text: 'text-base' },
  }[size]

  const shown = hovered ?? Math.round(rating)

  return (
    <div
      className={`flex items-center gap-1.5 ${dims.text} ${className}`}
      onMouseLeave={() => setHovered(null)}
    >
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= shown
          return (
            <motion.span
              key={star}
              onMouseEnter={() => setHovered(star)}
              className="relative inline-block"
              whileHover={reduce ? undefined : { scale: 1.25, y: -2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              <IconStar filled={filled} className={dims.star} />
            </motion.span>
          )
        })}
      </span>

      {showValue && (
        <span className="font-semibold text-body">{rating.toFixed(1)}</span>
      )}
      {typeof reviewCount === 'number' && (
        <span className="text-ink-subtle">({reviewCount.toLocaleString('en-US')})</span>
      )}
    </div>
  )
}

function IconStar({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={filled ? 'star-on' : 'star-off'}>
          <stop offset="0%" stopColor={filled ? '#fbbf24' : '#334155'} />
          <stop offset="100%" stopColor={filled ? '#f59e0b' : '#1e293b'} />
        </linearGradient>
      </defs>
      <path
        d="M12 2.6 14.9 8.5l6.5 1-4.7 4.6 1.1 6.5L12 17.5 6.2 20.6l1.1-6.5-4.7-4.6 6.5-1L12 2.6Z"
        fill="url(#star-on)"
        stroke="none"
        className={filled ? '' : 'opacity-60'}
      />
    </svg>
  )
}
