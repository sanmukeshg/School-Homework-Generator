import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  title: string
  subtitle?: string
  /** Renders a back chevron that pops the history stack. */
  back?: boolean
  /** Where back should go when the app was opened directly on this screen. */
  backTo?: string
  right?: ReactNode
}

export function TopBar({ title, subtitle, back, backTo = '/', right }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header className="app-safe-top sticky top-0 z-40 border-b border-line bg-app/95 backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {back && (
          <button
            type="button"
            aria-label="Go back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(backTo))}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-2xl text-muted active:bg-surface-2"
          >
            ‹
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>

        {right && <div className="flex flex-shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  )
}
