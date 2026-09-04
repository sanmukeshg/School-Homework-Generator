import { CheckIcon } from './icons'

interface StepIndicatorProps {
  steps: string[]
  /** 0-based. */
  current: number
  /** Jump back to an already-completed step. Forward is never offered. */
  onGoTo?: (index: number) => void
}

/**
 * Progress through the homework flow.
 *
 * A completed step is tappable, which is how most people go back — quicker
 * than the Back button and it makes the whole strip feel like navigation
 * rather than decoration.
 */
export function StepIndicator({ steps, current, onGoTo }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="flex items-start">
      {steps.map((label, index) => {
        const done = index < current
        const active = index === current
        const canGo = done && Boolean(onGoTo)

        return (
          <div key={label} className="flex min-w-0 flex-1 items-start">
            {/* Connector, drawn to the left of every step but the first, and
                filled once the step before it is behind us. */}
            {index > 0 && (
              <span
                aria-hidden="true"
                className="mt-3.5 h-[2px] min-w-[8px] flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor: done || active ? 'rgb(var(--c-primary) / 0.45)' : 'rgb(var(--c-border))'
                }}
              />
            )}

            <button
              type="button"
              disabled={!canGo}
              onClick={() => canGo && onGoTo?.(index)}
              aria-current={active ? 'step' : undefined}
              className={[
                'flex min-w-0 flex-col items-center gap-1.5 px-1',
                canGo ? 'active:scale-95' : 'cursor-default',
                index === 0 ? 'items-start pl-0' : '',
                index === steps.length - 1 ? 'items-end pr-0' : ''
              ].join(' ')}
            >
              <span
                className={[
                  'step-dot',
                  active ? 'step-dot-current' : done ? 'step-dot-done' : 'step-dot-todo'
                ].join(' ')}
              >
                {done ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
              </span>

              <span
                className={[
                  'text-center text-[10px] font-semibold uppercase leading-[1.15] tracking-[0.08em]',
                  active ? 'text-ink' : done ? 'text-muted' : 'text-faint'
                ].join(' ')}
              >
                {label}
              </span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
