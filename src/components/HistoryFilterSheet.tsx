import { useEffect, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { DateField } from './DateField'
import { listSubjects } from '../data/subjects'
import type { HomeworkCard, SchoolSettings } from '../types'

export interface HistoryFilters {
  fromDate: string
  toDate: string
  subject: string
}

export const NO_FILTERS: HistoryFilters = { fromDate: '', toDate: '', subject: '' }

export function isFiltering(filters: HistoryFilters): boolean {
  return Boolean(filters.fromDate || filters.toDate || filters.subject)
}

/**
 * The one definition of what the filters mean.
 *
 * Dates compare as YYYY-MM-DD strings, which sort chronologically — the same
 * comparison the list used before this sheet existed, so the results are
 * unchanged. A subject matches only when it actually carries work.
 */
export function matchesFilters(card: HomeworkCard, filters: HistoryFilters): boolean {
  if (filters.fromDate && card.date < filters.fromDate) return false
  if (filters.toDate && card.date > filters.toDate) return false
  if (
    filters.subject &&
    !card.items.some((item) => item.subjectKey === filters.subject && item.task.trim())
  ) {
    return false
  }
  return true
}

interface HistoryFilterSheetProps {
  open: boolean
  onClose: () => void
  /** The filters currently applied to the list. */
  value: HistoryFilters
  onApply: (filters: HistoryFilters) => void
  settings: SchoolSettings
  /** Counts matches for whatever is selected right now, before Apply. */
  countFor: (filters: HistoryFilters) => number
}

/**
 * The History filters, as a sheet.
 *
 * Edits are held locally and only handed back on Apply, so half-typed ranges
 * never flicker the list behind the sheet — and Cancel really does cancel.
 *
 * An invalid range cannot be produced: each calendar is bounded by the other,
 * so From can never be dragged past To.
 */
export function HistoryFilterSheet({
  open,
  onClose,
  value,
  onApply,
  settings,
  countFor
}: HistoryFilterSheetProps) {
  const [draft, setDraft] = useState<HistoryFilters>(value)

  // Re-open always starts from what is actually applied.
  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const patch = (changes: Partial<HistoryFilters>) =>
    setDraft((current) => ({ ...current, ...changes }))

  const matchCount = countFor(draft)

  return (
    <BottomSheet
      open={open}
      title="Filter History"
      subtitle={
        isFiltering(draft)
          ? `${matchCount} ${matchCount === 1 ? 'card' : 'cards'} match`
          : 'Showing every saved card'
      }
      onClose={onClose}
      size="tall"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDraft(NO_FILTERS)}
            disabled={!isFiltering(draft)}
            className="btn-ghost flex-1"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="btn-primary flex-[1.6] text-base"
          >
            Apply
          </button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <DateField
          label="From"
          value={draft.fromDate}
          onChange={(fromDate) => patch({ fromDate })}
          max={draft.toDate || undefined}
          placeholder="Any earlier date"
          clearable
        />

        <DateField
          label="To"
          value={draft.toDate}
          onChange={(toDate) => patch({ toDate })}
          min={draft.fromDate || undefined}
          placeholder="Any later date"
          clearable
        />

        <div>
          <label className="field-label" htmlFor="filter-subject">
            Subject
          </label>
          <select
            id="filter-subject"
            className="select"
            value={draft.subject}
            onChange={(event) => patch({ subject: event.target.value })}
          >
            <option value="">All subjects</option>
            {listSubjects(settings).map((option) => (
              <option key={option.id} value={option.id}>
                {option.preset.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </BottomSheet>
  )
}
