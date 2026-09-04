import { useMemo, useState } from 'react'
import { fromDateKey, toDateKey, todayKey } from '../utils/date'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/** Sunday-first, matching the rest of the app's day naming. */
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface CalendarPickerProps {
  /** YYYY-MM-DD, or '' for nothing chosen yet. */
  value: string
  onChange: (key: string) => void
  /** Inclusive bounds, YYYY-MM-DD. */
  min?: string
  max?: string
}

/** The first cell of the grid: the Sunday on or before the 1st. */
function gridStart(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return start
}

/**
 * A month grid the teacher taps.
 *
 * Built here rather than pulled in, because a date library would be a large
 * dependency for one screen, and the native picker cannot be styled to sit
 * inside a sheet consistently across Android and iOS.
 *
 * All arithmetic goes through the app's existing local-timezone date helpers,
 * so a tap can never land on the previous day the way a UTC round-trip does.
 */
export function CalendarPicker({ value, onChange, min, max }: CalendarPickerProps) {
  const today = todayKey()
  const anchor = value || today

  const [cursor, setCursor] = useState(() => {
    const date = fromDateKey(anchor)
    return { year: date.getFullYear(), month: date.getMonth() }
  })

  const days = useMemo(() => {
    const start = gridStart(cursor.year, cursor.month)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return {
        key: toDateKey(date),
        day: date.getDate(),
        inMonth: date.getMonth() === cursor.month
      }
    })
  }, [cursor])

  // A whole grid of trailing days means the month fits in five rows.
  const rows = days.slice(35).every((cell) => !cell.inMonth) ? 5 : 6
  const cells = days.slice(0, rows * 7)

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(current.year, current.month + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  const blocked = (key: string) => Boolean((min && key < min) || (max && key > max))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-2 text-lg text-ink active:scale-90"
        >
          ‹
        </button>

        <p aria-live="polite" className="text-sm font-semibold text-ink">
          {MONTHS[cursor.month]} {cursor.year}
        </p>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-2 text-lg text-ink active:scale-90"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAYS.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="grid h-8 place-items-center text-[11px] font-semibold uppercase tracking-wider text-faint"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const selected = value === cell.key
          const disabled = blocked(cell.key)
          return (
            <button
              key={cell.key}
              type="button"
              disabled={disabled}
              aria-label={cell.key}
              aria-current={selected ? 'date' : undefined}
              onClick={() => onChange(cell.key)}
              className={[
                'cal-cell',
                !cell.inMonth && !selected ? 'cal-cell-muted' : '',
                cell.key === today && !selected ? 'cal-cell-today' : '',
                selected ? 'cal-cell-selected' : 'active:bg-surface-2'
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
