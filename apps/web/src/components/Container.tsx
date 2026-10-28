import { type ReactNode } from 'react'

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        paddingInline: 'clamp(16px, 4vw, 32px)',
      }}
    >
      {children}
    </div>
  )
}
