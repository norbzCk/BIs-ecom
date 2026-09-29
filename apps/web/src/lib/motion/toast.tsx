import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'

export interface ToastAction {
  label: string
  to: string
}

export interface ToastPayload {
  title: string
  description?: string
  image?: string
  amount?: string
  tone?: 'default' | 'success' | 'error'
  action?: ToastAction
}

interface ToastEntry extends ToastPayload {
  id: number
}

interface ToastContextValue {
  push: (payload: ToastPayload) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_STYLES = {
  default: 'from-brand-500/25',
  success: 'from-emerald-500/25',
  error: 'from-rose-500/25',
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (payload: ToastPayload) => {
      const id = ++seq.current
      setToasts((prev) => [...prev.slice(-2), { ...payload, id }])
      window.setTimeout(() => dismiss(id), payload.tone === 'error' ? 5200 : 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2.5"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 40, scale: 0.94, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="panel pointer-events-auto relative overflow-hidden p-3"
            >
              <span
                className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${TONE_STYLES[toast.tone ?? 'default']} to-transparent`}
              />

              <div className="flex items-center gap-3">
                {toast.image ? (
                  <span className="size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas-raised">
                    <img
                      src={toast.image}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </span>
                ) : (
                  <motion.span
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${TONE_STYLES[toast.tone ?? 'default']} ${
                      toast.tone === 'error' ? 'text-rose-300' : 'text-brand-oncanvas'
                    }`}
                  >
                    {toast.tone === 'error' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-4">
                        <path d="M12 8v5M12 16.5v.01" strokeLinecap="round" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="size-4">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </motion.span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{toast.title}</p>
                  {toast.description && (
                    <p className="truncate text-xs text-ink-muted">{toast.description}</p>
                  )}
                </div>

                {toast.amount && (
                  <span className="shrink-0 text-sm font-bold text-ink">{toast.amount}</span>
                )}
              </div>

              {toast.action && (
                <Link
                  to={toast.action.to}
                  onClick={() => dismiss(toast.id)}
                  className="mt-2.5 block rounded-lg border border-line bg-surface-inset py-1.5 text-center text-xs font-semibold text-ink transition hover:border-line-strong hover:bg-surface-glass-hover hover:text-ink"
                >
                  {toast.action.label}
                </Link>
              )}

              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="absolute top-2 right-2 flex size-5 items-center justify-center rounded text-ink-subtle transition hover:bg-surface-glass-hover hover:text-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-3">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
