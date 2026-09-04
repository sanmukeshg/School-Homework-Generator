import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { CalendarPicker } from './CalendarPicker'
import { CalendarIcon } from './icons'
import { formatDisplayDate, fromDateKey, todayKey } from '../utils/date'

interface DateFieldProps {
  label: string
  /** YYYY-MM-DD, or '' when nothing is chosen. */
  value: string
  onChange: (key: string) => void
  min?: string
  max?: string
  /** Shown in place of a date when the value is empty. */
  placeholder?: string
  /** Offers a Clear action — for optional filter dates. */
  clearable?: boolean
  /** Small print under the control. */
  hint?: string
}

/**
 * A date, chosen from a calendar in a sheet.
 *
 * Replaces `<input type="date">` across the app. The native control is a
 * different shape, size and interaction on every platform — on iOS it was the
 * source of two earlier alignment bugs — and it cannot be opened from inside a
 * sheet reliably. One component means the date reads the same everywhere.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = 'Any date',
  clearable = false,
  hint
}: DateFieldProps) {
  const [open, setOpen] = useState(false)

  const display = value ? formatDisplayDate(fromDateKey(value)) : placeholder

  function choose(key: string) {
    onChange(key)
    setOpen(false)
  }

  return (
    <div>
      <p className="field-label">{label}</p>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="field flex items-center justify-between gap-2 text-left"
      >
        <span className={value ? 'truncate text-ink' : 'truncate text-faint'}>{display}</span>
        <CalendarIcon className="h-5 w-5 flex-shrink-0 text-muted" />
      </button>

      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{hint}</p>}

      <BottomSheet
        open={open}
        title={label}
        subtitle={value ? display : undefined}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {clearable && (
              <button
                type="button"
                onClick={() => choose('')}
                className="btn-ghost flex-1"
                disabled={!value}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => choose(todayKey())}
              className="btn-secondary flex-1"
            >
              Today
            </button>
          </div>
        }
      >
        <CalendarPicker value={value} onChange={choose} min={min} max={max} />
      </BottomSheet>
    </div>
  )
}
