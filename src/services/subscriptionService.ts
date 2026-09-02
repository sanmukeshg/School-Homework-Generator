import {
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData
} from 'firebase/firestore'
import { getDb } from '../firebase/firestore'
import { addCalendarMonths } from '../utils/date'

/** How long the complimentary access lasts. */
export const TRIAL_MONTHS = 6

export type SubscriptionPlan = 'trial' | 'paid'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'

/**
 * The authoritative account record, `subscriptions/{uid}`.
 *
 * The client may read it and, exactly once, stamp the end of its own trial from
 * the server clock. Everything to do with payment is left null here and is only
 * ever written by a trusted backend — the Security Rules enforce that, they do
 * not merely assume it.
 */
export interface SubscriptionRecord {
  uid: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  trialStartedAt: Date | null
  trialEndsAt: Date | null
  subscriptionStartedAt: Date | null
  subscriptionEndsAt: Date | null
  paymentProvider: string | null
  paymentCustomerId: string | null
  paymentSubscriptionId: string | null
  updatedAt: Date | null
}

function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null
}

function fromFirestore(uid: string, data: DocumentData): SubscriptionRecord {
  return {
    uid,
    plan: (data.plan as SubscriptionPlan) ?? 'trial',
    status: (data.status as SubscriptionStatus) ?? 'active',
    trialStartedAt: toDate(data.trialStartedAt),
    trialEndsAt: toDate(data.trialEndsAt),
    subscriptionStartedAt: toDate(data.subscriptionStartedAt),
    subscriptionEndsAt: toDate(data.subscriptionEndsAt),
    paymentProvider: data.paymentProvider ?? null,
    paymentCustomerId: data.paymentCustomerId ?? null,
    paymentSubscriptionId: data.paymentSubscriptionId ?? null,
    updatedAt: toDate(data.updatedAt)
  }
}

/**
 * Stamps `trialEndsAt` six calendar months after the server-recorded start.
 *
 * The start comes from `serverTimestamp()`, and it is read back from the server
 * rather than the cache so the end date is never derived from a device clock.
 * The Rules allow this write only while `trialEndsAt` is still null, so a
 * client cannot extend its own trial by repeating it.
 */
async function stampTrialEnd(uid: string): Promise<void> {
  const db = getDb()
  if (!db) return

  const ref = doc(db, 'subscriptions', uid)
  const fresh = await getDocFromServer(ref)
  const startedAt = toDate(fresh.data()?.trialStartedAt)
  if (!startedAt) return

  await updateDoc(ref, {
    trialEndsAt: Timestamp.fromDate(addCalendarMonths(startedAt, TRIAL_MONTHS)),
    updatedAt: serverTimestamp()
  })
}

/**
 * Creates the account record on first sign-in and returns it.
 *
 * Safe to call on every launch: an existing record is returned untouched. If a
 * previous attempt was interrupted — the connection dropped between creating
 * the document and stamping its end date — the missing step is completed here.
 */
export async function ensureSubscription(uid: string): Promise<SubscriptionRecord | null> {
  const db = getDb()
  if (!db) return null

  const ref = doc(db, 'subscriptions', uid)
  const existing = await getDoc(ref)

  if (!existing.exists()) {
    await setDoc(ref, {
      uid,
      plan: 'trial',
      status: 'active',
      trialStartedAt: serverTimestamp(),
      trialEndsAt: null,
      subscriptionStartedAt: null,
      subscriptionEndsAt: null,
      paymentProvider: null,
      paymentCustomerId: null,
      paymentSubscriptionId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    await stampTrialEnd(uid)
  } else if (!existing.data().trialEndsAt) {
    await stampTrialEnd(uid)
  }

  const settled = await getDoc(ref)
  return settled.exists() ? fromFirestore(uid, settled.data()) : null
}

/** Live view of the account record, so a change made elsewhere lands here too. */
export function observeSubscription(
  uid: string,
  callback: (record: SubscriptionRecord | null) => void
): () => void {
  const db = getDb()
  if (!db) {
    callback(null)
    return () => {}
  }

  return onSnapshot(
    doc(db, 'subscriptions', uid),
    (snapshot) => callback(snapshot.exists() ? fromFirestore(uid, snapshot.data()) : null),
    (error) => {
      console.error('[subscription] Could not read the account record', error)
      callback(null)
    }
  )
}
