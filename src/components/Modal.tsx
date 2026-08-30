import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  /** Rendered bottom-up on the sheet: primary action first. */
  actions: ReactNode
}

/** A bottom sheet — the mobile-native shape for a confirm dialog. */
export function Modal({ open, title, children, onClose, actions }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div
        className="relative w-full max-w-md rounded-t-3xl border-t border-line bg-surface p-5 shadow-2xl"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />

        <h2 className="text-base font-semibold text-ink">{title}</h2>

        <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>

        <div className="mt-5 space-y-2">{actions}</div>
      </div>
    </div>
  )
}
