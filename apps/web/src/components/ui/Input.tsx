import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ style, ...props }: InputProps) {
  return (
    <input
      style={{
        height: '44px',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        fontSize: '16px',
        paddingInline: '12px',
        width: '100%',
        ...style,
      }}
      {...props}
    />
  )
}

export function Select({ style, children, ...props }: InputHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      style={{
        height: '44px',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        fontSize: '16px',
        paddingInline: '12px',
        width: '100%',
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
}
