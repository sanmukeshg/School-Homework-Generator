import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { ConfirmSheet } from '../components/ConfirmSheet'
import {
  HistoryFilterSheet,
  isFiltering,
  matchesFilters,
  NO_FILTERS,
  type HistoryFilters
} from '../components/HistoryFilterSheet'
import { TopBar } from '../components/TopBar'
import { FunnelIcon, TrashIcon } from '../components/icons'
import { formatClassSection } from '../data/academics'
import { resolveSubject } from '../data/subjects'
import { useHomeworkSyncSignal } from '../hooks/useHomeworkSync'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { countFilledItems, deleteCard, listCards } from '../services/homeworkService'
import type { HomeworkCard } from '../types'
import { formatDisplayDate, fromDateKey, isToday } from '../utils/date'

export function HistoryPage() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { toast } = useToast()
  const [cards, setCards] = useState<HomeworkCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<HistoryFilters>(NO_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<HomeworkCard | null>(null)
  const syncSignal = useHomeworkSyncSignal()

  useEffect(() => {
    void refresh()
  }, [syncSignal])

  async function refresh() {
    const all = await listCards()
    setCards(all)
    setLoading(false)
  }

  /** Deletes exactly one card (and its draft) — never a whole date. */
  async function confirmDelete() {
    const card = pendingDelete
    if (!card) return
    setPendingDelete(null)
    await deleteCard(card.id)
    await refresh()
    toast('Homework deleted')
  }

  const filtering = isFiltering(filters)

  // Filtering is a plain read over data already loaded — offline safe, and it
  // never touches the records themselves. The three filters combine.
  const visible = useMemo(
    () => cards.filter((card) => matchesFilters(card, filters)),
    [cards, filters]
  )

  // Lets the sheet show a live count for a selection that is not applied yet.
  const countFor = useCallback(
    (candidate: HistoryFilters) => cards.filter((card) => matchesFilters(card, candidate)).length,
    [cards]
  )

  // Group by day, newest first (listCards is already sorted that way).
  const days = useMemo(() => {
    const groups: { date: string; label: string; cards: HomeworkCard[] }[] = []
    for (const card of visible) {
      const last = groups[groups.length - 1]
      if (last && last.date === card.date) last.cards.push(card)
      else groups.push({ date: card.date, label: card.displayDate || card.date, cards: [card] })
    }
    return groups
  }, [visible])

  /** Short, readable descriptions of what is currently applied. */
  const activeChips = useMemo(() => {
    const chips: string[] = []
    if (filters.fromDate && filters.toDate) {
      chips.push(
        `${formatDisplayDate(fromDateKey(filters.fromDate))} – ${formatDisplayDate(fromDateKey(filters.toDate))}`
      )
    } else if (filters.fromDate) {
      chips.push(`From ${formatDisplayDate(fromDateKey(filters.fromDate))}`)
    } else if (filters.toDate) {
      chips.push(`Until ${formatDisplayDate(fromDateKey(filters.toDate))}`)
    }
    if (filters.subject) chips.push(resolveSubject(settings, filters.subject).name)
    return chips
  }, [filters, settings])

  return (
    <div className="screen">
      <TopBar
        title="History"
        subtitle="Every card you have saved"
        right={
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-label={filtering ? 'Change filters' : 'Filter history'}
            className={['icon-btn relative', filtering ? 'text-brand' : ''].join(' ')}
            style={
              filtering
                ? {
                    borderColor: 'rgb(var(--c-primary) / 0.45)',
                    backgroundColor: 'rgb(var(--c-primary) / 0.1)'
                  }
                : undefined
            }
          >
            <FunnelIcon />
            {/* A dot, so an active filter is obvious without reading. */}
            {filtering && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-surface-2"
              />
            )}
          </button>
        }
      />

      <div className="screen-body pt-4">
        {/* What is applied right now, and one tap to drop it. */}
        {filtering && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2.5">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {activeChips.map((chip) => (
                <span key={chip} className="chip-brand normal-case tracking-normal">
                  {chip}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="min-h-[40px] flex-shrink-0 rounded-lg px-2.5 text-xs font-semibold text-muted active:scale-95"
            >
              Clear
            </button>
          </div>
        )}

        <p className="mb-3 px-1 text-xs text-muted">
          {filtering
            ? `Showing ${visible.length} of ${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`
            : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'} saved`}
        </p>

        {loading ? (
          <p className="pt-6 text-center text-sm text-muted">Loading…</p>
        ) : days.length === 0 ? (
          <div className="panel text-center">
            <p className="text-sm text-muted">
              {filtering ? 'No homework matches these filters.' : 'No homework saved yet.'}
            </p>
            {filtering ? (
              <button
                type="button"
                onClick={() => setFilters(NO_FILTERS)}
                className="btn-secondary mx-auto mt-4"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-primary mx-auto mt-4"
              >
                Create Homework
              </button>
            )}
          </div>
        ) : (
          days.map((day) => (
            <section key={day.date} className="mb-6">
              <h2 className="panel-title mb-2 flex items-center gap-2 px-1">
                {day.label}
                {isToday(day.date) && <span className="chip-brand">Today</span>}
              </h2>

              <ul className="space-y-2">
                {day.cards.map((card) => (
                  <li key={card.id} className="panel flex items-center gap-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">
                        {formatClassSection(settings, card)}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {card.day} · {countFilledItems(card)}{' '}
                        {countFilledItems(card) === 1 ? 'subject' : 'subjects'}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={`Delete homework for ${formatClassSection(settings, card)} on ${card.displayDate}`}
                      onClick={() => setPendingDelete(card)}
                      className="icon-btn-danger"
                    >
                      <TrashIcon />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/preview/${card.id}`)}
                      className="flex-shrink-0 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-xs font-semibold text-ink active:scale-95"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <HistoryFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={(next) => {
          setFilters(next)
          setFilterOpen(false)
        }}
        settings={settings}
        countFor={countFor}
      />

      <ConfirmSheet
        open={pendingDelete !== null}
        title="Delete Homework?"
        message={
          pendingDelete
            ? `Are you sure you want to delete the ${formatClassSection(settings, pendingDelete)} homework for ${pendingDelete.displayDate}? Other cards are not affected.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      <BottomNav />
    </div>
  )
}
