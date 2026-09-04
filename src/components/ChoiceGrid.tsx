import { CheckIcon } from './icons'

export interface Choice {
  id: string
  label: string
}

interface ChoiceGridProps {
  choices: Choice[]
  /** Ids currently picked. */
  selected: string[]
  onToggle: (id: string) => void
  /** How many across. Sections are short, subjects and classes are not. */
  columns?: 2 | 3
  /** Describes the group for screen readers. */
  label: string
}

/**
 * A grid of cards the teacher taps to pick from.
 *
 * One component for classes, sections and subjects so all three read and behave
 * the same during onboarding. A picked card turns green *and* gains a tick —
 * colour alone would leave the choice invisible to anyone who cannot separate
 * green from grey.
 */
export function ChoiceGrid({ choices, selected, onToggle, columns = 3, label }: ChoiceGridProps) {
  const picked = new Set(selected)

  return (
    <div
      role="group"
      aria-label={label}
      className={['grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3'].join(' ')}
    >
      {choices.map((choice) => {
        const on = picked.has(choice.id)
        return (
          <button
            key={choice.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(choice.id)}
            className={['choice-card', on ? 'choice-card-on' : ''].join(' ')}
          >
            {on && (
              <span className="choice-tick" aria-hidden="true">
                <CheckIcon className="h-2.5 w-2.5" />
              </span>
            )}
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}
