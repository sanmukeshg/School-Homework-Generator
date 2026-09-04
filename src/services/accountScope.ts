import { getDB, STORE_CARDS, STORE_DRAFTS, STORE_META, STORE_SETTINGS } from '../db'
import { META_CACHE_OWNER } from '../db/schema'
import { clearTourState } from './tourService'

/**
 * Ties the device's local cache to one account.
 *
 * IndexedDB is per-device, not per-account. Without an owner recorded on it,
 * data left behind by the last teacher to use the phone looks exactly like
 * "work this device has not synced yet" — which is how a second account signing
 * in inherited the first one's homework and settings, and pushed them into its
 * own Firestore account.
 *
 * So the cache carries the uid it belongs to, and every sign-in reconciles:
 *
 * - same uid          keep everything (this is the normal case, and it is what
 *                     preserves offline use and sign-out/sign-in as one person)
 * - no uid recorded   claim it — an installation that predates this record, or
 *                     a genuine first sign-in with local work to migrate
 * - a different uid   wipe it before anything reads or syncs
 *
 * Nothing is wiped at sign-out on purpose. Signing out and back in as the same
 * teacher must not throw away their offline work, and a phone that is closed
 * between the two is still handled, because the decision is made when the next
 * account arrives rather than when the last one leaves.
 */
export type ScopeAction =
  /** No account — nothing to reconcile. */
  | 'none'
  /** The cache already belongs to this account. */
  | 'kept'
  /** Unowned cache adopted by this account. */
  | 'claimed'
  /** Another account's cache was found and removed. */
  | 'cleared'

export interface ScopeResult {
  action: ScopeAction
  /** The uid that owned the cache before this ran, if any. */
  previousOwner: string | null
}

export async function readCacheOwner(): Promise<string | null> {
  const db = await getDB()
  const record = await db.get(STORE_META, META_CACHE_OWNER)
  return record?.value ?? null
}

async function writeCacheOwner(uid: string): Promise<void> {
  const db = await getDB()
  await db.put(STORE_META, { key: META_CACHE_OWNER, value: uid, updatedAt: Date.now() })
}

/**
 * Removes every trace of the previous account from this device.
 *
 * Settings, cards and drafts go in one transaction so a failure cannot leave a
 * half-wiped cache that still looks usable. The meta store is deliberately not
 * cleared — the new owner is written immediately afterwards.
 */
async function clearLocalUserData(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction([STORE_SETTINGS, STORE_CARDS, STORE_DRAFTS], 'readwrite')
  await Promise.all([
    tx.objectStore(STORE_SETTINGS).clear(),
    tx.objectStore(STORE_CARDS).clear(),
    tx.objectStore(STORE_DRAFTS).clear(),
    tx.done
  ])

  // Kept outside IndexedDB, so it has to be cleared explicitly or the new
  // teacher silently skips the walkthrough the previous one dismissed.
  clearTourState()
}

/**
 * Reconciles the cache with the account that has just signed in.
 *
 * Must finish before anything reads local data or starts a sync — that
 * ordering is the whole fix, not an optimisation.
 */
export async function ensureAccountScope(uid: string | null): Promise<ScopeResult> {
  if (!uid) return { action: 'none', previousOwner: null }

  const previousOwner = await readCacheOwner()

  if (previousOwner === uid) return { action: 'kept', previousOwner }

  if (previousOwner === null) {
    await writeCacheOwner(uid)
    return { action: 'claimed', previousOwner }
  }

  await clearLocalUserData()
  await writeCacheOwner(uid)
  return { action: 'cleared', previousOwner }
}
