import { Container } from './Container'
import { store } from '../config/store'
import { Link } from 'react-router-dom'

function TodoValue({ value }: { value: string }) {
  if (typeof value === 'string' && value.indexOf('TODO_') === 0) {
    if (import.meta.env && import.meta.env.DEV) {
      return <span style={{ border: '1px dashed var(--color-danger)', padding: '2px 4px' }}>{value}</span>
    }
    return null
  }
  return <>{value}</>
}

function SocialIcon({ href, label }: { href: string; label: string }) {
  if (!href || (typeof href === 'string' && href.indexOf('TODO_') === 0)) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        width: '40px',
        height: '40px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </a>
  )
}

export function SiteFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer
      style={{
        background: 'var(--color-footer-bg)',
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-text)',
      }}
    >
      <Container>
        <div
          style={{
            paddingBlock: '48px',
          }}
          className="footer-top"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
              gap: '32px',
            }}
            className="footer-grid"
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>About</h3>
              <p style={{ fontSize: '15px', color: 'var(--color-text)', lineHeight: '1.6' }}>
                <TodoValue value={store.about} />
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Quick links</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li>
                  <Link to="/shop" style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                    Search
                  </Link>
                </li>
                <li>
                  <Link to="/support" style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/support" style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                    Refund
                  </Link>
                </li>
                <li>
                  <Link to="/support" style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                    Shipping
                  </Link>
                </li>
                <li>
                  <Link to="/support" style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                    Terms
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Contact</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {store.phone && (
                  <li>
                    <a href={`tel:${store.phone.replace(/\s+/g, '')}`} style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                      {store.phone}
                    </a>
                  </li>
                )}
                {store.whatsapp && store.whatsapp.indexOf('TODO_') !== 0 && (
                  <li>
                    <a
                      href={`https://wa.me/${store.whatsapp.replace(/\+/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}
                    >
                      WhatsApp
                    </a>
                  </li>
                )}
                {store.email && (
                  <li>
                    <a href={`mailto:${store.email}`} style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                      {store.email}
                    </a>
                  </li>
                )}
                {store.address && store.address.indexOf('TODO_') !== 0 && (
                  <li style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                    <TodoValue value={store.address} />
                  </li>
                )}
                {store.openingHours && store.openingHours.indexOf('TODO_') !== 0 && (
                  <li style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
                    <TodoValue value={store.openingHours} />
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Newsletter</h3>
              {(import.meta.env && import.meta.env.DEV) || (store as any).newsletterEndpoint ? (
                <form
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                  className="newsletter-form"
                >
                  <input
                    type="email"
                    placeholder="Email"
                    aria-label="Email address for newsletter"
                    style={{
                      height: '44px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      fontSize: '16px',
                      padding: '0 12px',
                      flex: 1,
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      height: '44px',
                      background: 'var(--color-cta)',
                      color: 'var(--color-cta-text)',
                      border: '1px solid var(--color-cta)',
                      borderRadius: '8px',
                      padding: '0 16px',
                      fontSize: '14px',
                    }}
                  >
                    Subscribe
                  </button>
                </form>
              ) : null}

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <SocialIcon href={(store as any).facebook || 'TODO_FACEBOOK'} label="Facebook" />
                <SocialIcon href={(store as any).instagram || 'TODO_INSTAGRAM'} label="Instagram" />
                <SocialIcon href={(store as any).linkedin || 'TODO_LINKEDIN'} label="LinkedIn" />
                <SocialIcon href={(store as any).tiktok || 'TODO_TIKTOK'} label="TikTok" />
                <SocialIcon href={(store as any).youtube || 'TODO_YOUTUBE'} label="YouTube" />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            paddingBlock: '32px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
          className="footer-bottom"
        >
          <div style={{ fontSize: '14px', color: 'var(--color-text)' }}>
            © {new Date().getFullYear()} {store.name}
          </div>
          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            style={{
              height: '44px',
              padding: '0 16px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '14px',
            }}
          >
            Back to top
          </button>
        </div>
      </Container>
      <style>{`
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 2fr 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-top {
            padding-block: 32px !important;
          }
          .footer-bottom {
            justify-content: center !important;
            flex-direction: column !important;
            text-align: center;
          }
          .newsletter-form {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .newsletter-form input,
          .newsletter-form button {
            width: 100%;
          }
        }
      `}</style>
    </footer>
  )
}
