import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData
} from 'firebase/firestore'
import { getDb } from '../firebase/firestore'
import type { SubscriptionPlan, SubscriptionStatus } from './subscriptionService'

/**
 * The administrator role.
 *
 * A document at `admins/{uid}` is the grant — there is no flag on the user
 * record and no client-side list of privileged emails. Whether a caller is an
 * administrator is decided by the Security Rules on every single request, so
 * everything here is a convenience for drawing the screen: hiding a button
 * grants nothing and revealing one grants nothing either.
 *
 * The first administrator is created out of band, from the Firebase console:
 * add a document to `admins` whose id is the account's uid, with `uid`,
 * `grantedBy` and `grantedAt`. No client can mint the first one, which is
 * exactly what stops anyone promoting themselves.
 */
export interface AdminRecord {
  uid: string
  grantedBy: string
  grantedAt: Date | null
}

/** One row of the user list. */
export interface ManagedUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  createdAt: Date | null
  lastLoginAt: Date | null
  isAdmin: boolean
  plan: SubscriptionPlan | null
  status: SubscriptionStatus | null
  trialEndsAt: Date | null
}

function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null
}

/**
 * Whether this account is an administrator.
 *
 * Reads its own `admins/{uid}` document, which the rules allow for the owner
 * and nobody else. A missing document — the normal case — simply means no.
 */
export async function checkIsAdmin(uid: string): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  try {
    const snapshot = await getDoc(doc(db, 'admins', uid))
    return snapshot.exists()
  } catch {
    // Offline, or the read was refused. Either way, not an administrator: the
    // safe answer is the one that shows less.
    return false
  }
}

function mapUser(id: string, data: DocumentData): Omit<ManagedUser, 'isAdmin' | 'plan' | 'status' | 'trialEndsAt'> {
  return {
    uid: id,
    email: (data.email as string) ?? null,
    displayName: (data.displayName as string) ?? null,
    photoURL: (data.photoURL as string) ?? null,
    createdAt: toDate(data.createdAt),
    lastLoginAt: toDate(data.lastLoginAt)
  }
}

/**
 * Every registered account, newest first, with its plan and role folded in.
 *
 * Three collection reads rather than one read per user: at this size that is
 * both cheaper and simpler than fanning out, and the Admin Panel is opened
 * rarely.
 */
export async function listUsers(max = 200): Promise<ManagedUser[]> {
  const db = getDb()
  if (!db) return []

  const [users, subs, admins] = await Promise.all([
    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(max))),
    getDocs(collection(db, 'subscriptions')),
    getDocs(collection(db, 'admins'))
  ])

  const subById = new Map(subs.docs.map((entry) => [entry.id, entry.data()]))
  const adminIds = new Set(admins.docs.map((entry) => entry.id))

  return users.docs.map((entry) => {
    const sub = subById.get(entry.id)
    return {
      ...mapUser(entry.id, entry.data()),
      isAdmin: adminIds.has(entry.id),
      plan: (sub?.plan as SubscriptionPlan) ?? null,
      status: (sub?.status as SubscriptionStatus) ?? null,
      trialEndsAt: toDate(sub?.trialEndsAt)
    }
  })
}

export async function listAdmins(): Promise<AdminRecord[]> {
  const db = getDb()
  if (!db) return []
  const snapshot = await getDocs(collection(db, 'admins'))
  return snapshot.docs.map((entry) => ({
    uid: entry.id,
    grantedBy: (entry.data().grantedBy as string) ?? '',
    grantedAt: toDate(entry.data().grantedAt)
  }))
}

/** Promotes an account. Refused by the rules unless the caller is an admin. */
export async function grantAdmin(uid: string, grantedBy: string): Promise<void> {
  const db = getDb()
  if (!db) throw new Error('Not connected')
  await setDoc(doc(db, 'admins', uid), {
    uid,
    grantedBy,
    grantedAt: serverTimestamp()
  })
}

/**
 * Stands an administrator down.
 *
 * The rules refuse this when the target is the caller, so a project cannot be
 * left with nobody able to administer it. The UI does not offer it either, but
 * the rule is what makes it true.
 */
export async function revokeAdmin(uid: string): Promise<void> {
  const db = getDb()
  if (!db) throw new Error('Not connected')
  await deleteDoc(doc(db, 'admins', uid))
}
