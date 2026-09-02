import type { SubscriptionRecord } from './subscriptionService'

export type EntitlementState =
  /** Inside the complimentary six months. */
  | 'trial'
  /** A paid subscription is running. */
  | 'active'
  /** The trial or subscription has run out. */
  | 'expired'
  /** No account record has been read yet — offline first launch, say. */
  | 'unknown'

export interface Entitlement {
  state: EntitlementState
  /** When the current entitlement runs out, if it has an end date. */
  endsAt: Date | null
  /** Whole days remaining, floored at zero. Null when there is no end date. */
  daysRemaining: number | null
  /** Whether the app's features should be available right now. */
  hasAccess: boolean
}

/**
 * The one place entitlement is decided.
 *
 * Every screen asks this rather than reading dates itself, so introducing paid
 * plans later means changing this function and nothing else. The record it
 * reads comes from Firestore; the clock is only used to compare against dates
 * the server issued, never to decide when a trial began.
 */
export function evaluateEntitlement(
  record: SubscriptionRecord | null,
  now: Date = new Date()
): Entitlement {
  if (!record) {
    // Nothing read yet. Don't lock anyone out on the strength of a missing read.
    return { state: 'unknown', endsAt: null, daysRemaining: null, hasAccess: true }
  }

  if (record.plan === 'paid') {
    const endsAt = record.subscriptionEndsAt
    const running = record.status === 'active' && (!endsAt || endsAt.getTime() > now.getTime())
    return {
      state: running ? 'active' : 'expired',
      endsAt,
      daysRemaining: endsAt ? daysBetween(now, endsAt) : null,
      hasAccess: running
    }
  }

  const endsAt = record.trialEndsAt
  if (!endsAt) {
    // Created but not yet stamped; treat as running rather than expired.
    return { state: 'trial', endsAt: null, daysRemaining: null, hasAccess: true }
  }

  const running = record.status === 'active' && endsAt.getTime() > now.getTime()
  return {
    state: running ? 'trial' : 'expired',
    endsAt,
    daysRemaining: daysBetween(now, endsAt),
    hasAccess: running
  }
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}
