import { DateField } from './DateField'
import type { SchoolSettings } from '../types'
import { dayName, formatDisplayDate, fromDateKey } from '../utils/date'

interface BasicDetailsFieldsProps {
  classId: string
  sectionId: string
  date: string
  settings: SchoolSettings
  onClassChange: (id: string) => void
  onSectionChange: (id: string) => void
  onDateChange: (key: string) => void
  /** Keeps label/control ids unique when two copies are mounted. */
  idPrefix?: string
}

/**
 * Class, section and date — the first decision of every card.
 *
 * Shared by the sheet that starts a card from the dashboard and by step 1 of
 * the editor, so the two cannot drift apart.
 */
export function BasicDetailsFields({
  classId,
  sectionId,
  date,
  settings,
  onClassChange,
  onSectionChange,
  onDateChange,
  idPrefix = 'basic'
}: BasicDetailsFieldsProps) {
  const parsed = date ? fromDateKey(date) : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-class`}>
            Class
          </label>
          <select
            id={`${idPrefix}-class`}
            className="select"
            value={classId}
            onChange={(event) => onClassChange(event.target.value)}
          >
            <option value="">Select Class</option>
            {settings.classes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor={`${idPrefix}-section`}>
            Section
          </label>
          <select
            id={`${idPrefix}-section`}
            className="select"
            value={sectionId}
            onChange={(event) => onSectionChange(event.target.value)}
          >
            <option value="">Select Section</option>
            {settings.sections.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DateField
        label="Date"
        value={date}
        onChange={onDateChange}
        placeholder="Choose a date"
        hint={
          parsed
            ? `On the card: ${formatDisplayDate(parsed)} (${dayName(parsed)})`
            : undefined
        }
      />
    </div>
  )
}
