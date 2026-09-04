import { getDB, normaliseCard, STORE_CARDS } from '../db'
import { readCacheOwner } from './accountScope'
import {
  cloudListCards,
  cloudPutCards,
  readMigrationMarker,
  writeMigrationMarker
} from './cloudHomeworkService'
import type { HomeworkCard } from '../types'

/**
 * Keeps the local cache and the account's cloud history in step.
 *
 * The product is online-first, so this is deliberately small: one collection
 * read per session, a merge, and a bulk write into IndexedDB. There is no
 * journal, no tombstone table and no mutation queue — Firestore already
 * replays a queued write when the connection returns, and everything else is
 * decided by comparing `updatedAt`.
 */

/** How stale the local cache may get before a foreground refresh pulls again. */
export const REFRESH_INTERVAL_MS = 5 * 60 * 1000

let lastPullAt = 0
let inFlight: Promise<void> | null = null

type Listener = () => void
const listeners = new Set<Listener>()

/** Screens subscribe so a completed pull refreshes what is on screen. */
export function onHomeworkSynced(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function announce(): void {
  for (const listener of listeners) listener()
}

async function readLocalCards(): Promise<HomeworkCard[]> {
  const db = await getDB()
  return (await db.getAll(STORE_CARDS)).map(normaliseCard)
}

async function writeLocalCards(cards: HomeworkCard[], removeIds: string[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE_CARDS, 'readwrite')
  await Promise.all([
    ...cards.map((card) => tx.store.put(card)),
    ...removeIds.map((id) => tx.store.delete(id))
  ])
  await tx.done
}

/**
 * First sync for an account: merge whatever this device already holds with
 * whatever the account already holds, newest `updatedAt` winning, then push the
 * result up and record that it happened.
 *
 * Repeat-safe by construction — cards keep their own ids, so a re-run can only
 * overwrite a card with itself — but the marker still matters: it is what stops
 * a card deleted on another device from being resurrected here on every launch.
 */
async function migrate(uid: string, cloud: HomeworkCard[]): Promise<void> {
  // Only ever merge a cache this account owns. ensureAccountScope() has
  // already guaranteed it, and this second check is what makes the leak
  // structurally impossible rather than merely prevented: local work is never
  // attributed to whoever happens to be signed in.
  const owner = await readCacheOwner()
  const local = owner === uid ? await readLocalCards() : []
  if (owner !== uid) {
    console.warn('[homework] Local cache belongs to another account; not merging it.')
  }

  const byId = new Map<string, HomeworkCard>()

  for (const card of cloud) byId.set(card.id, card)
  for (const card of local) {
    const existing = byId.get(card.id)
    if (!existing || card.updatedAt > existing.updatedAt) byId.set(card.id, card)
  }

  const merged = [...byId.values()]
  await writeLocalCards(merged, [])

  // Push anything the cloud is missing or holds an older copy of.
  const cloudById = new Map(cloud.map((card) => [card.id, card]))
  const toPush = merged.filter((card) => {
    const remote = cloudById.get(card.id)
    return !remote || card.updatedAt > remote.updatedAt
  })
  if (toPush.length) await cloudPutCards(uid, toPush)

  await writeMigrationMarker(uid)
}

/**
 * Normal sync: the cloud is authoritative. Cards missing from it were deleted
 * on another device and are dropped locally too, which is what makes deletion
 * stick across devices without needing tombstones.
 */
async function adopt(cloud: HomeworkCard[]): Promise<void> {
  const local = await readLocalCards()
  const cloudIds = new Set(cloud.map((card) => card.id))
  const removeIds = local.filter((card) => !cloudIds.has(card.id)).map((card) => card.id)
  await writeLocalCards(cloud, removeIds)
}

/**
 * Pulls the account's history into the local cache.
 *
 * Concurrent calls share one run, so a foreground event arriving during the
 * sign-in pull cannot start a second collection read.
 */
export async function pullHomework(uid: string): Promise<void> {
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const migrated = await readMigrationMarker(uid)
      const cloud = await cloudListCards(uid)

      if (migrated) await adopt(cloud)
      else await migrate(uid, cloud)

      lastPullAt = Date.now()
      announce()
    } catch (error) {
      // Offline or a transient failure. The local cache is untouched and still
      // correct for this device; the next foreground event tries again.
      console.error('[homework] Sync failed; continuing with the local cache', error)
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/** Pulls only if the cache has gone stale. Used by the foreground refresh. */
export async function pullIfStale(uid: string): Promise<void> {
  if (Date.now() - lastPullAt < REFRESH_INTERVAL_MS) return
  await pullHomework(uid)
}

/** Called on sign-out so the next account starts with a fresh interval. */
export function resetSyncState(): void {
  lastPullAt = 0
}
