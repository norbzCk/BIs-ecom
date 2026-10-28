import { Container } from './Container'
import { store } from '../config/store'

export function TrustStrip() {
  const trustPoints = store.trustPoints || []
  if (!Array.isArray(trustPoints) || trustPoints.length === 0) {
    return null
  }

  return (
    <section style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
      <Container>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            paddingBlock: '24px',
          }}
          className="trust-strip-grid"
        >
          {trustPoints.map((point: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {point.icon}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>{point.title}</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{point.text}</div>
              </div>
            </div>
          ))}
        </div>
      </Container>
      <style>{`
        @media (max-width: 1024px) {
          .trust-strip-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .trust-strip-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
