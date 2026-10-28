import { type ReactNode } from 'react'

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Badge({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: '8px',
        fontSize: '12px',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function SectionHeading({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)' }}>{title}</h2>
      {action}
    </div>
  )
}

export function IconWrapper({ children }: { children: ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
}

export function IconButton({
  children,
  'aria-label': ariaLabel,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }) {
  return (
    <button
      aria-label={ariaLabel}
      style={{
        minWidth: '44px',
        minHeight: '44px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        background: 'transparent',
        color: 'var(--color-text)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
