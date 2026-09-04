import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { NewHomeworkSheet } from '../components/NewHomeworkSheet'
import { PlusIcon } from '../components/icons'
import { formatClassSection } from '../data/academics'
import { useHomeworkSyncSignal } from '../hooks/useHomeworkSync'
import { useSettings } from '../hooks/useSettings'
import {
  countFilledItems,
  listCards,
  listEntriesForDate,
  type DashboardEntry
} from '../services/homeworkService'
import type { HomeworkCard } from '../types'
import { dayName, formatDisplayDate, relativeDayLabel, todayKey } from '../utils/date'
import { uid } from '../utils/id'

/** "3 subjects" / "1 subject" */
function subjectCount(card: HomeworkCard): string {
  const n = countFilledItems(card)
  return `${n} ${n === 1 ? 'subject' : 'subjects'}`
}

export function HomePage() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [today, setToday] = useState<DashboardEntry[]>([])
  const [recent, setRecent] = useState<HomeworkCard[]>([])
  const [loading, setLoading] = useState(true)
  const [startOpen, setStartOpen] = useState(false)
  // A completed sync should refresh what is already on screen.
  const syncSignal = useHomeworkSyncSignal()

  const todayId = todayKey()
  const now = new Date()

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [entries, all] = await Promise.all([listEntriesForDate(todayId), listCards()])
      if (cancelled) return
      setToday(entries)
      setRecent(all.filter((card) => card.date !== todayId).slice(0, 3))
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [todayId, syncSignal])

  function startCard(basics: { classId: string; sectionId: string; date: string }) {
    setStartOpen(false)
    navigate(`/edit/${uid('card')}`, { state: { isNew: true, step: 1, basics } })
  }

  return (
    <div className="screen">
      <div className="screen-body app-safe-top pb-28 pt-5">
        {/* School identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
            {settings.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-muted">{settings.initials || 'SCH'}</span>
            )}
          </div>
          {/* Long names wrap to a second line instead of being cut off. */}
          <h1 className="line-clamp-2 min-w-0 flex-1 text-[17px] font-semibold leading-[1.25] tracking-tight text-ink">
            {settings.schoolName}
          </h1>
        </div>

        {/* Today */}
        <section className="panel mt-5">
          <p className="panel-title">Today</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {formatDisplayDate(now)}
          </p>
          <p className="text-sm text-muted">{dayName(now)}</p>

          <button
            type="button"
            onClick={() => setStartOpen(true)}
            className="btn-primary mt-4 w-full text-base"
          >
            Create Homework
          </button>
        </section>

        {/* Today's cards, one per class and section */}
        <section className="mt-6">
          <h2 className="panel-title mb-2 px-1">Today&apos;s Homework</h2>

          {loading ? (
            <p className="panel text-sm text-muted">Loading…</p>
          ) : today.length === 0 ? (
            <div className="panel text-center">
              <p className="text-sm text-muted">No homework cards created today.</p>
              <button
                type="button"
                onClick={() => setStartOpen(true)}
                className="btn-secondary mx-auto mt-3"
              >
                Create Homework
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {today.map((entry) => (
                <li key={entry.card.id} className="panel flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">
                      {formatClassSection(settings, entry.card)}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {subjectCount(entry.card)}
                      {entry.status === 'draft' && ' · unsaved draft'}
                    </p>
                  </div>

                  {entry.status === 'draft' && <span className="chip-accent">Draft</span>}

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        entry.status === 'draft'
                          ? `/edit/${entry.card.id}`
                          : `/preview/${entry.card.id}`
                      )
                    }
                    className="flex-shrink-0 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-xs font-semibold text-ink active:scale-95"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Earlier days */}
        {recent.length > 0 && (
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="panel-title">Recent</h2>
              <Link to="/history" className="text-xs font-semibold text-accent">
                See all
              </Link>
            </div>

            <ul className="space-y-2">
              {recent.map((card) => (
                <li key={card.id}>
                  <Link
                    to={`/preview/${card.id}`}
                    className="panel flex items-center justify-between gap-3 active:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink">
                        {relativeDayLabel(card.date)}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {formatClassSection(settings, card)} · {subjectCount(card)}
                      </p>
                    </div>
                    <span className="text-faint">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-6 px-1 text-center text-[11px] leading-relaxed text-faint">
          Everything is stored on this phone only. Take a backup from Settings now and then.
        </p>
      </div>

      {/* Floating create action, clear of the navigation bar */}
      <button
        type="button"
        aria-label="Create homework"
        onClick={() => setStartOpen(true)}
        className="fixed right-5 z-40 grid h-14 w-14 place-items-center rounded-full transition active:scale-90"
        style={{
          bottom: 'calc(84px + env(safe-area-inset-bottom))',
          backgroundImage: 'linear-gradient(135deg, rgb(var(--c-primary)), rgb(var(--c-primary-2)))',
          color: 'rgb(var(--c-on-primary))',
          boxShadow: '0 8px 20px rgb(var(--c-primary) / 0.4)'
        }}
      >
        <PlusIcon />
      </button>

      <NewHomeworkSheet
        open={startOpen}
        onClose={() => setStartOpen(false)}
        onContinue={startCard}
        onOpenExisting={(existing) => {
          setStartOpen(false)
          navigate(`/preview/${existing.id}`)
        }}
      />

      <BottomNav />
    </div>
  )
}
