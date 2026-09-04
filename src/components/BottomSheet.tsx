import { useEffect, useRef, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Pinned under the scrolling body, above the safe area. */
  footer?: ReactNode
  /** Small print under the title. */
  subtitle?: string
  /**
   * The most of the screen the sheet may take. It is a cap, not a height —
   * every sheet still hugs its own content and scrolls inside if it outgrows
   * the cap.
   *
   * 'short' — around two thirds at most. For the short forms that start a
   *           task: enough for a stepper and its fields, while leaving the
   *           screen behind visible so the sheet still reads as a layer.
   * 'auto'  — hugs the content (confirmations, a calendar).
   * 'tall'  — most of the screen, for the long lists in Settings.
   */
  size?: 'short' | 'auto' | 'tall'
}

/**
 * The app's one bottom sheet.
 *
 * Every focused interaction — confirm, edit a setting, pick filters, start a
 * card — is this component, so they all dismiss the same way and all sit at a
 * height the thumb can reach.
 *
 * Notes on the mobile behaviour it has to get right:
 *
 * - The page behind must not scroll while the sheet is open, or a swipe in the
 *   sheet drags the page underneath on iOS.
 * - The body scrolls, not the whole sheet, so the footer's actions stay put
 *   when the keyboard opens over a long form.
 * - Height is capped in `dvh`, which shrinks with the on-screen keyboard on
 *   modern mobile browsers; `vh` does not, and the footer would be buried.
 */
export function BottomSheet({
  open,
  title,
  onClose,
  children,
  footer,
  subtitle,
  size = 'auto'
}: BottomSheetProps) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    // Lock the page behind. Restoring the exact previous value matters because
    // sheets can stack (a confirm sheet over an editor sheet).
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus to the sheet itself, so screen readers and the keyboard
    // follow it. Deliberately not to the first field: on a phone that pops the
    // on-screen keyboard the instant the sheet opens, covering the thing the
    // teacher was about to read. Tab order then starts at the top of the sheet.
    const focusTimer = window.setTimeout(() => {
      panel.current?.focus({ preventScroll: true })
    }, 60)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      window.clearTimeout(focusTimer)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="sheet-scrim absolute inset-0 bg-black/60"
      />

      <div
        ref={panel}
        tabIndex={-1}
        className="sheet-panel relative flex w-full max-w-md flex-col rounded-t-3xl border-t border-line bg-surface shadow-2xl outline-none"
        style={{
          maxHeight:
            size === 'tall'
              ? 'min(88dvh, 760px)'
              : size === 'short'
                ? 'min(65dvh, 580px)'
                : '85dvh'
        }}
      >
        {/* Grab handle. Decorative — the scrim and Close button do the work. */}
        <div className="flex-shrink-0 px-5 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        </div>

        <div className="flex flex-shrink-0 items-start gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl text-muted active:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div
          data-sheet-body
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>

        <div
          className="flex-shrink-0 px-5 pt-3"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {footer}
        </div>
      </div>
    </div>
  )
}
