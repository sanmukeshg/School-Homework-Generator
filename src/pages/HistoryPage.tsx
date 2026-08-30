import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { TopBar } from '../components/TopBar'
import { TrashIcon } from '../components/icons'
import { formatClassSection } from '../data/academics'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { countFilledItems, deleteCard, listCards } from '../services/homeworkService'
import type { HomeworkCard } from '../types'
import { isToday } from '../utils/date'

export function HistoryPage() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { toast } = useToast()
  const [cards, setCards] = useState<HomeworkCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [pendingDelete, setPendingDelete] = useState<HomeworkCard | null>(null)

  useEffect(() => {
    void refresh()
  }, [])

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

  // Filtering is a plain read over data already loaded — offline safe, and it
  // never touches the records themselves.
  const visible = useMemo(
    () => (filterDate ? cards.filter((card) => card.date === filterDate) : cards),
    [cards, filterDate]
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

  return (
    <div className="screen">
      <TopBar title="History" subtitle="Every card you have saved" />

      <div className="screen-body pt-4">
        {/* Date filter */}
        <div className="panel mb-4">
          <label className="field-label" htmlFor="history-filter">
            Filter by date
          </label>
          <div className="flex gap-2">
            <input
              id="history-filter"
              type="date"
              className="field flex-1"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setFilterDate('')}
              disabled={!filterDate}
              className="btn-secondary px-4 text-sm"
            >
              Clear
            </button>
          </div>
          {filterDate && (
            <p className="mt-2 text-xs text-muted">
              Showing {visible.length} {visible.length === 1 ? 'card' : 'cards'} for this date.
            </p>
          )}
        </div>

        {loading ? (
          <p className="pt-6 text-center text-sm text-muted">Loading…</p>
        ) : days.length === 0 ? (
          <div className="panel text-center">
            <p className="text-sm text-muted">
              {filterDate ? 'No homework saved for that date.' : 'No homework saved yet.'}
            </p>
            {!filterDate && (
              <button
                type="button"
                onClick={() => navigate('/new')}
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
