const KEY = 'almanac-tour'

/**
 * Whether the guided walkthrough should run.
 *
 * Kept in localStorage rather than in SchoolSettings on purpose: the tour is
 * about learning this screen on this device, not about the school, and putting
 * it in settings would change the shape of the document that syncs to the
 * account for something no other device needs to know.
 *
 * Every access is wrapped — a browser with site data blocked throws on read,
 * and a tour is never worth failing a boot over.
 */
type TourState = 'pending' | 'done'

function read(): TourState | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'pending' || value === 'done' ? value : null
  } catch {
    return null
  }
}

function write(state: TourState): void {
  try {
    localStorage.setItem(KEY, state)
  } catch {
    /* Nothing to do: the tour simply will not be remembered. */
  }
}

/**
 * Notified when the tour is asked for again.
 *
 * The tour component is mounted for the whole session, so it cannot learn about
 * a replay by reading the flag at mount time — Settings tells it directly.
 */
type Listener = () => void
const listeners = new Set<Listener>()

export function onTourRequested(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Called when setup finishes, and when Settings offers the tour again. */
export function markTourPending(): void {
  write('pending')
  listeners.forEach((listener) => listener())
}

/** True only when setup has just finished, or the teacher asked to see it again. */
export function isTourPending(): boolean {
  return read() === 'pending'
}

/**
 * Forgets the walkthrough entirely.
 *
 * Used when a different account takes over this device: the next teacher must
 * be offered the tour, not inherit the last one's decision to skip it.
 */
export function clearTourState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* Nothing to do. */
  }
}

export function markTourDone(): void {
  write('done')
}
