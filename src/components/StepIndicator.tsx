import { CheckIcon } from './icons'

interface StepIndicatorProps {
  steps: string[]
  /** 0-based. */
  current: number
  /** Jump back to an already-completed step. Forward is never offered. */
  onGoTo?: (index: number) => void
}

/** Dot diameter, and the length of the short rule drawn between two dots. */
const DOT = 28
const LINE = 28

/**
 * Progress through the homework flow.
 *
 * Laid out as equal grid columns rather than a flex row: every step then gets
 * exactly the same width, so the dots land on the same rhythm and each label
 * centres under its own dot no matter how long the words are.
 *
 * The connector is a short rule centred on the midpoint between two dots. The
 * midpoint sits exactly one half-column past this column's centre, which is
 * `100%` of the column's own width, so centring the rule there keeps it
 * equidistant from both dots without running under the labels.
 *
 * A completed step is tappable, which is how most people go back — quicker
 * than the Back button and it makes the whole strip feel like navigation
 * rather than decoration.
 */
export function StepIndicator({ steps, current, onGoTo }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Progress"
      className="grid"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((label, index) => {
        const done = index < current
        const active = index === current
        const canGo = done && Boolean(onGoTo)

        return (
          <div key={label} className="relative flex flex-col items-center">
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute h-[2px] rounded-full transition-colors"
                style={{
                  top: DOT / 2 - 1,
                  left: `calc(100% - ${LINE / 2}px)`,
                  width: LINE,
                  backgroundColor: done ? 'rgb(var(--c-primary) / 0.45)' : 'rgb(var(--c-border))'
                }}
              />
            )}

            <button
              type="button"
              disabled={!canGo}
              onClick={() => canGo && onGoTo?.(index)}
              aria-current={active ? 'step' : undefined}
              className={[
                'flex w-full flex-col items-center gap-1.5 px-1',
                canGo ? 'active:scale-95' : 'cursor-default'
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
