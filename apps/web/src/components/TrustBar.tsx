import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Stagger, StaggerItem } from '../lib/motion/reveal'
import { Icon, type IconName } from './icons'

const ITEMS: { title: string; body: string; icon: IconName; to: string }[] = [
  {
    title: 'Verified stock',
    body: 'Every unit inspected and logged before it ships',
    icon: 'Shield',
    to: '/support#warranty',
  },
  {
    title: 'Insured delivery',
    body: 'Tracked couriers with insurance on every parcel',
    icon: 'Truck',
    to: '/support#shipping',
  },
  {
    title: 'Direct warranty',
    body: 'Manufacturer coverage, handled by us — no paperwork',
    icon: 'Award',
    to: '/support#warranty',
  },
  {
    title: '30-day returns',
    body: 'Money back, no restocking fee, prepaid label',
    icon: 'Refresh',
    to: '/support#returns',
  },
]

export function TrustBar() {
  return (
    <div className="relative border-y border-line-faint bg-canvas-raised/40">
      <Stagger
        className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8"
        stagger={0.08}
      >
        {ITEMS.map((item) => {
          const I = Icon[item.icon]
          return (
            <StaggerItem key={item.title}>
              <Link to={item.to} className="group flex items-start gap-3.5">
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-linear-to-b from-surface-inset to-transparent text-brand-oncanvas transition-all duration-500 group-hover:border-brand-400/60 group-hover:text-brand-oncanvas">
                  <I className="size-5" />
                  <motion.span
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100"
                    style={{ boxShadow: '0 0 0 1px rgb(91 118 255 / 0.5), 0 0 28px -6px rgb(91 118 255 / 0.8)' }}
                    whileHover={{ opacity: 1 }}
                  />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-subtle">{item.body}</p>
                </div>
              </Link>
            </StaggerItem>
          )
        })}
      </Stagger>
    </div>
  )
}
