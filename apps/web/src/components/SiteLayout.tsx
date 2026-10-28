import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'

export function SiteLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" style={{ flex: 1 }}>
        {children}
      </main>

      <SiteFooter />

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        style={{
          position: 'fixed',
          right: '20px',
          bottom: '20px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          display: showTop ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
        }}
      >
        ↑
      </button>

      <span className="sr-only" aria-live="polite">
        {pathname}
      </span>
    </div>
  )
}
