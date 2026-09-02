let counter = 0

/**
 * A new local id.
 *
 * Ids became Firestore document ids once homework started syncing, so two
 * devices must never mint the same one. `crypto.randomUUID` is available in
 * every secure context this app runs in; the fallback covers the rest by
 * mixing random bits into the old time-and-counter scheme.
 *
 * Existing ids are never rewritten — this only affects ids created from now on.
 */
export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  counter += 1
  const random = Math.floor(Math.random() * 0xffffffff).toString(36)
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${random}`
}
