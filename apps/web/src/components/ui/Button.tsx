import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    transition: 'all 0.2s ease',
  }

  const sizeStyle: React.CSSProperties =
    size === 'sm'
      ? { height: '36px', paddingInline: '12px' }
      : { height: '44px', paddingInline: '16px' }

  const variantStyle: React.CSSProperties = (() => {
    if (variant === 'primary') {
      return {
        background: 'var(--color-cta)',
        color: 'var(--color-cta-text)',
        borderColor: 'var(--color-cta)',
      }
    }
    if (variant === 'secondary') {
      return {
        background: 'var(--color-primary)',
        color: 'var(--color-primary-text)',
        borderColor: 'var(--color-primary)',
      }
    }
    if (variant === 'outline') {
      return {
        background: 'transparent',
        color: 'var(--color-text)',
        borderColor: 'var(--color-border)',
      }
    }
    if (variant === 'ghost') {
      return {
        background: 'transparent',
        color: 'var(--color-text)',
        borderColor: 'transparent',
      }
    }
    return {}
  })()

  return (
    <button
      disabled={disabled || loading}
      style={{ ...baseStyle, ...sizeStyle, ...variantStyle, ...style }}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
