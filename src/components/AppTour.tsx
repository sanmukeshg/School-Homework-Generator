import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isTourPending, markTourDone, onTourRequested } from '../services/tourService'

interface TourStep {
  /** Matches a `data-tour` attribute somewhere in the app. */
  target: string
  title: string
  body: string
  /** Route this step lives on. The tour navigates there first. */
  route: string
}

const STEPS: TourStep[] = [
  {
    target: 'create',
    route: '/',
    title: 'Create the day’s homework',
    body: 'Start here each morning. You pick the class, section and date, fill in the work, then review the finished card before you send it.'
  },
  {
    target: 'nav-settings',
    route: '/',
    title: 'Settings',
    body: 'Your school name and logo live here, along with the classes, sections and subjects you chose during setup. Change any of them whenever you like.'
  },
  {
    target: 'nav-history',
    route: '/',
    title: 'History',
    body: 'Every card you have saved, newest first, grouped by day. Open one to share it again, or delete one you no longer need.'
  },
  {
    target: 'history-filter',
    route: '/history',
    title: 'Find an older card',
    body: 'Tap the funnel to filter by a date range or a subject. Pick the dates from the calendar, tap Apply, and History shows only the matching cards.'
  }
]

/** Space left between the highlight and the card. */
const MARGIN = 12

interface Box {
  top: number
  left: number
  width: number
  height: number
}

/**
 * The first-use walkthrough.
 *
 * Points at the real controls rather than describing them in a list, and moves
 * between screens when a step lives elsewhere — the History filter can only be
 * explained where it actually is.
 *
 * Nothing is blocked while it runs: the highlight is a hole in a dimmed
 * overlay, and the overlay swallows taps so a teacher cannot half-complete an
 * action mid-explanation. Skip is offered on every step.
 */
export function AppTour() {
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)

  const start = useCallback(() => {
    setIndex(0)
    setActive(true)
  }, [])

  // Runs when setup has just finished, and again whenever Settings asks.
  useEffect(() => {
    if (isTourPending()) start()
    return onTourRequested(start)
  }, [start])

  const step = active ? STEPS[index] : null

  // Move to the screen this step is about before looking for its target.
  useEffect(() => {
    if (!step) return
    const path = location.pathname === '' ? '/' : location.pathname
    if (path !== step.route) navigate(step.route)
  }, [step, location.pathname, navigate])

  const measure = useCallback(() => {
    if (!step) return
    const node = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!node) {
      setBox(null)
      return
    }
    const rect = node.getBoundingClientRect()
    setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
  }, [step])

  // The target may not exist for a frame or two after navigating, so poll
  // briefly rather than measuring once and giving up.
  useEffect(() => {
    if (!step) return
    measure()
    const poll = window.setInterval(measure, 120)
    const stop = window.setTimeout(() => window.clearInterval(poll), 2500)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearInterval(poll)
      window.clearTimeout(stop)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, measure])

  function finish() {
    markTourDone()
    setActive(false)
    navigate('/')
  }

  function next() {
    if (index < STEPS.length - 1) setIndex(index + 1)
    else finish()
  }

  if (!step) return null

  // Below the highlight when there is room, otherwise above it.
  const viewportH = window.innerHeight
  const cardTop =
    box && box.top + box.height + MARGIN + 190 < viewportH
      ? box.top + box.height + MARGIN
      : box
        ? Math.max(MARGIN, box.top - MARGIN - 190)
        : viewportH / 2 - 95

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="App tour">
      {/* Swallows taps so nothing can be triggered mid-explanation. */}
      <div className="absolute inset-0" onClick={next} />

      {box && (
        <div
          className="tour-hole"
          style={{
            top: box.top - 4,
            left: box.left - 4,
            width: box.width + 8,
            height: box.height + 8
          }}
        />
      )}

      <div className="tour-card left-1/2 -translate-x-1/2" style={{ top: cardTop }}>
        <p className="panel-title">
          Step {index + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1.5 text-[15px] font-semibold leading-tight text-ink">{step.title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">{step.body}</p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={finish}
            className="min-h-[44px] rounded-xl px-3 text-xs font-semibold text-muted active:scale-95"
          >
            Skip
          </button>
          <span className="flex-1" />
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              className="btn-secondary min-h-[44px] px-4 text-sm"
            >
              Back
            </button>
          )}
          <button type="button" onClick={next} className="btn-primary min-h-[44px] px-5 text-sm">
            {index === STEPS.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
