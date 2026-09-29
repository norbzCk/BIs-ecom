import { motion } from 'motion/react'
import { useTheme } from '../lib/theme'
import { Icon } from './icons'

/**
 * Light/dark switch. The accessible name tracks the action ("Switch to light
 * mode"), not the current state, and `aria-pressed` carries the state, so
 * screen readers announce the toggle rather than a static label.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className={`relative flex size-9 items-center justify-center overflow-hidden rounded-xl border border-line-faint bg-surface-glass text-ink-muted transition hover:border-line-strong hover:text-ink ${className}`}
    >
      <motion.span
        key={theme}
        initial={{ y: 14, opacity: 0, rotate: -35 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-center"
      >
        {isDark ? <Icon.Sun className="size-[18px]" /> : <Icon.Moon className="size-[18px]" />}
      </motion.span>
    </button>
  )
}
