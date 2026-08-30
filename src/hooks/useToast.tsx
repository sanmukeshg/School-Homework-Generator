import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

interface ToastState {
  message: string
  tone: 'ok' | 'warn'
}

interface ToastApi {
  toast: (message: string) => void
  warn: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((message: string, tone: ToastState['tone']) => {
    window.clearTimeout(timer.current)
    setState({ message, tone })
    timer.current = window.setTimeout(() => setState(null), 2800)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      toast: (message) => show(message, 'ok'),
      warn: (message) => show(message, 'warn')
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
        style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div
          className={[
            'flex items-center gap-2 rounded-2xl border bg-surface px-4 py-3 text-sm font-bold shadow-2xl transition-all duration-300',
            state ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
            state?.tone === 'warn' ? 'border-danger text-danger' : 'border-brand text-brand'
          ].join(' ')}
        >
          <span>{state?.message ?? ''}</span>
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
