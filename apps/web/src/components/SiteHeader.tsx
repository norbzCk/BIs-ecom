import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cart-context'
import { store } from '../config/store'
import { useCatalog } from '../lib/catalog'
import { Icon } from './icons'
import { Container } from './Container'

const FALLBACK_CATEGORIES = [
  'Laptops',
  'Desktops',
  'MacBooks',
  'Printers',
  'External Hard Disks',
  'Toners & Cartridges',
]

const MORE_CATEGORIES = [
  'Projectors',
  'UPS',
  'Flash Disks',
  'Antivirus',
  'Monitors',
  'Shredders',
]

function TodoValue({ value }: { value: string }) {
  if (typeof value === 'string' && value.indexOf('TODO_') === 0) {
    if (import.meta.env && import.meta.env.DEV) {
      return <span style={{ border: '1px dashed var(--color-danger)', padding: '2px 4px' }}>{value}</span>
    }
    return null
  }
  return <>{value}</>
}

export function SiteHeader() {
  const { itemCount } = useCart()
  const { categories } = useCatalog()
  const navigate = useNavigate()
  const location = useLocation()

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLButtonElement>(null)
  const lastFocusRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    setCategoryDropdownOpen(false)
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCategoryDropdownOpen(false)
        setMobileMenuOpen(false)
      }
      if (mobileMenuOpen && e.key === 'Tab' && mobileMenuRef.current) {
        const focusableElements = mobileMenuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select',
        )
        if (focusableElements.length === 0) return
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (selectedCategory && selectedCategory !== 'All Categories') {
      params.set('category', selectedCategory)
    }
    navigate(`/shop${params.toString() ? '?' + params.toString() : ''}`)
  }

  const getCategoryItems = () => {
    if (categories && categories.length > 0) {
      const sorted = [...categories].sort((a: any, b: any) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder
        }
        return (b.productCount || 0) - (a.productCount || 0)
      })
      return sorted.slice(0, 6).map((c: any) => c.name)
    }
    return FALLBACK_CATEGORIES
  }

  const categoryItems = getCategoryItems()
  const moreItems = categories && categories.length > 0 && categories.length > 6 ? [] : MORE_CATEGORIES

  return (
    <>
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>
      <div
        style={{
          background: 'var(--color-announcement-bg)',
          color: 'var(--color-announcement-text)',
          fontSize: '14px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
        }}
        className="w-full"
      >
        <Container>
          <div className="flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
            <span>
              <TodoValue value={store.freeDeliveryNote} />
            </span>
            <a href={`tel:${store.phone.replace(/\s+/g, '')}`} style={{ color: 'var(--color-announcement-text)' }}>
              {store.phone}
            </a>
          </div>
        </Container>
      </div>

      <header
        style={{
          background: 'var(--color-header-bg)',
          borderBottom: '1px solid var(--color-border)',
        }}
        className="sticky top-0 z-50 h-[56px] md:h-[64px]"
      >
        <Container className="h-full">
          <div className="flex h-full items-center gap-3">
            <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Billionaires Computers home">
              <img
                src="/brand/logo.svg"
                alt="Billionaires Computers logo"
                style={{ height: '40px', width: 'auto' }}
              />
              <span style={{ fontSize: '20px', fontWeight: 600 }} className="hidden sm:block">
                {store.name}
              </span>
            </Link>

            <div className="hidden md:flex flex-1 items-center">
              <form onSubmit={submitSearch} className="flex w-full max-w-2xl items-stretch">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRight: 'none',
                    borderRadius: '8px 0 0 8px',
                    background: 'var(--color-surface)',
                    fontSize: '16px',
                    padding: '0 12px',
                    height: '44px',
                  }}
                  aria-label="Select category"
                >
                  <option>All Categories</option>
                  {categoryItems.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  aria-label="Search products"
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRight: 'none',
                    borderRadius: 0,
                    background: 'var(--color-surface)',
                    fontSize: '16px',
                    padding: '0 12px',
                    flex: 1,
                    height: '44px',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'var(--color-cta)',
                    color: 'var(--color-cta-text)',
                    border: '1px solid var(--color-cta)',
                    borderRadius: '0 8px 8px 0',
                    height: '44px',
                    padding: '0 20px',
                    fontSize: '14px',
                  }}
                  aria-label="Search"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/account"
                className="flex items-center gap-1"
                style={{ color: 'var(--color-text)', minHeight: '44px', padding: '0 8px' }}
                aria-label="Account"
              >
                <Icon.User style={{ width: '20px', height: '20px' }} />
                <span className="hidden lg:inline">Login / Signup</span>
              </Link>
              <Link
                to="/cart"
                className="flex items-center gap-1 relative"
                style={{ color: 'var(--color-text)', minHeight: '44px', padding: '0 8px' }}
                aria-label={`Cart, ${itemCount} items`}
              >
                <Icon.Cart style={{ width: '20px', height: '20px' }} />
                <span className="hidden lg:inline">Cart</span>
                {itemCount > 0 && (
                  <span
                    style={{
                      background: 'var(--color-accent)',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      minWidth: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      position: 'absolute',
                      top: '0',
                      right: '0',
                    }}
                    aria-label={`${itemCount} items in cart`}
                  >
                    {itemCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden"
                style={{ color: 'var(--color-text)', minHeight: '44px', minWidth: '44px' }}
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                <Icon.Menu style={{ width: '24px', height: '24px' }} />
              </button>
            </div>
          </div>
          <div className="md:hidden pb-2">
            <form onSubmit={submitSearch} className="flex items-stretch">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                aria-label="Search products"
                style={{
                  border: '1px solid var(--color-border)',
                  borderRight: 'none',
                  borderRadius: '8px 0 0 8px',
                  background: 'var(--color-surface)',
                  fontSize: '16px',
                  padding: '0 12px',
                  flex: 1,
                  height: '44px',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--color-cta)',
                  color: 'var(--color-cta-text)',
                  border: '1px solid var(--color-cta)',
                  borderRadius: '0 8px 8px 0',
                  height: '44px',
                  padding: '0 16px',
                  fontSize: '14px',
                }}
                aria-label="Search"
              >
                Search
              </button>
            </form>
          </div>
        </Container>
      </header>

      <nav
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          height: '44px',
        }}
        className="hidden lg:block"
        aria-label="Category navigation"
      >
        <Container className="h-full">
          <div className="flex h-full items-center gap-6">
            {categoryItems.map((cat) => (
              <Link
                key={cat}
                to={`/shop?category=${encodeURIComponent(cat)}`}
                style={{ color: 'var(--color-text)', fontSize: '15px', height: '44px', display: 'flex', alignItems: 'center' }}
              >
                {cat}
              </Link>
            ))}
            {(moreItems.length > 0 || (categories && categories.length > 6)) && (
              <div
                ref={categoryDropdownRef}
                className="relative"
                onMouseEnter={() => setCategoryDropdownOpen(true)}
                onMouseLeave={() => setCategoryDropdownOpen(false)}
              >
                <button
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setCategoryDropdownOpen(!categoryDropdownOpen)
                    }
                  }}
                  style={{ color: 'var(--color-text)', fontSize: '15px', height: '44px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  aria-expanded={categoryDropdownOpen}
                  aria-haspopup="true"
                >
                  More Categories
                  <span>▾</span>
                </button>
                {categoryDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '44px',
                      left: '0',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      minWidth: '200px',
                      zIndex: 50,
                    }}
                  >
                    {moreItems.map((cat) => (
                      <Link
                        key={cat}
                        to={`/shop?category=${encodeURIComponent(cat)}`}
                        style={{ display: 'block', padding: '8px 16px', color: 'var(--color-text)', fontSize: '15px', height: '44px', lineHeight: '44px' }}
                        onClick={() => setCategoryDropdownOpen(false)}
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Link
              to="/support"
              style={{ color: 'var(--color-text)', fontSize: '15px', height: '44px', display: 'flex', alignItems: 'center' }}
            >
              Contact Us
            </Link>
          </div>
        </Container>
      </nav>

      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--color-overlay)',
            zIndex: 100,
          }}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        ref={mobileMenuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: '280px',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          zIndex: 101,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 600 }}>Menu</span>
          <button
            ref={firstFocusRef}
            onClick={() => setMobileMenuOpen(false)}
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav style={{ padding: '16px', flex: 1 }}>
          {categoryItems.map((cat) => (
            <Link
              key={cat}
              to={`/shop?category=${encodeURIComponent(cat)}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'block',
                padding: '12px 0',
                color: 'var(--color-text)',
                fontSize: '15px',
                height: '44px',
                lineHeight: '44px',
              }}
            >
              {cat}
            </Link>
          ))}
          {moreItems.map((cat) => (
            <Link
              key={cat}
              to={`/shop?category=${encodeURIComponent(cat)}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'block',
                padding: '12px 0',
                color: 'var(--color-text)',
                fontSize: '15px',
                height: '44px',
                lineHeight: '44px',
              }}
            >
              {cat}
            </Link>
          ))}
          <Link
            to="/support"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'block',
              padding: '12px 0',
              color: 'var(--color-text)',
              fontSize: '15px',
              height: '44px',
              lineHeight: '44px',
              borderTop: '1px solid var(--color-border)',
              marginTop: '8px',
              paddingTop: '16px',
            }}
          >
            Contact Us
          </Link>
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)' }}>
          <Link
            ref={lastFocusRef}
            to="/account"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'block',
              padding: '12px 0',
              color: 'var(--color-text)',
              fontSize: '15px',
              height: '44px',
              lineHeight: '44px',
            }}
          >
            Login / Signup
          </Link>
        </div>
      </div>

      <style>{`
        .skip-to-content {
          position: absolute;
          left: -10000px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        .skip-to-content:focus {
          position: absolute;
          left: 0;
          top: 0;
          width: auto;
          height: auto;
          overflow: visible;
          background: var(--color-accent);
          color: #ffffff;
          padding: 8px 16px;
          z-index: 1000;
          text-decoration: none;
          outline: 2px solid var(--color-focus);
          outline-offset: 2px;
        }
      `}</style>
    </>
  )
}
