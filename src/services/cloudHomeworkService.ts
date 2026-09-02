import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type DocumentData,
  type Firestore
} from 'firebase/firestore'
import { getDb } from '../firebase/firestore'
import { normaliseCard } from '../db'
import type { HomeworkCard } from '../types'

/**
 * The cloud copy of homework: `users/{uid}/homework/{cardId}`.
 *
 * This module only talks to Firestore. It is never the app's read path — the UI
 * reads IndexedDB — so there is deliberately no per-card getter or slot query
 * here. Reads exist for one purpose: pulling the account's history into the
 * local cache.
 */
export const HOMEWORK_SCHEMA_VERSION = 2

/** Firestore commits at most 500 operations per batch. */
const BATCH_LIMIT = 400

function homeworkCollection(db: Firestore, uid: string) {
  return collection(db, 'users', uid, 'homework')
}

function toCloud(card: HomeworkCard) {
  return {
    date: card.date,
    displayDate: card.displayDate,
    day: card.day,
    classId: card.classId,
    sectionId: card.sectionId,
    lifeSkill: card.lifeSkill,
    word: card.word,
    meaning: card.meaning,
    showMeaning: card.showMeaning,
    synonym: card.synonym,
    announcement: card.announcement,
    // Subject rows travel as plain objects. No generated image is ever stored.
    items: card.items.map((item) => ({
      id: item.id,
      subjectKey: item.subjectKey,
      subjectName: item.subjectName,
      task: item.task
    })),
    createdAt: card.createdAt ? Timestamp.fromMillis(card.createdAt) : serverTimestamp(),
    // The server's clock decides ordering, so a wrong device clock cannot make
    // a stale card look newer than one saved elsewhere.
    updatedAt: serverTimestamp(),
    schemaVersion: HOMEWORK_SCHEMA_VERSION
  }
}

function fromCloud(id: string, data: DocumentData): HomeworkCard {
  const created = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now()
  // A document read straight back from cache still has updatedAt pending.
  const updated = data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : created

  return normaliseCard({
    id,
    date: data.date,
    displayDate: data.displayDate,
    day: data.day,
    classId: data.classId,
    sectionId: data.sectionId,
    lifeSkill: data.lifeSkill,
    word: data.word,
    meaning: data.meaning,
    showMeaning: data.showMeaning,
    synonym: data.synonym,
    announcement: data.announcement,
    items: data.items,
    createdAt: created,
    updatedAt: updated
  })
}

/** The whole account history. One collection read, used by the pull. */
export async function cloudListCards(uid: string): Promise<HomeworkCard[]> {
  const db = getDb()
  if (!db) return []
  const snapshot = await getDocs(homeworkCollection(db, uid))
  return snapshot.docs.map((entry) => fromCloud(entry.id, entry.data()))
}

export async function cloudSaveCard(uid: string, card: HomeworkCard): Promise<void> {
  const db = getDb()
  if (!db) return
  await setDoc(doc(homeworkCollection(db, uid), card.id), toCloud(card))
}

export async function cloudDeleteCard(uid: string, id: string): Promise<void> {
  const db = getDb()
  if (!db) return
  await deleteDoc(doc(homeworkCollection(db, uid), id))
}

export async function cloudPutCards(uid: string, cards: HomeworkCard[]): Promise<void> {
  const db = getDb()
  if (!db || cards.length === 0) return

  for (let start = 0; start < cards.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const card of cards.slice(start, start + BATCH_LIMIT)) {
      batch.set(doc(homeworkCollection(db, uid), card.id), toCloud(card))
    }
    await batch.commit()
  }
}

export async function cloudDeleteAllCards(uid: string): Promise<void> {
  const db = getDb()
  if (!db) return

  const snapshot = await getDocs(homeworkCollection(db, uid))
  for (let start = 0; start < snapshot.docs.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const entry of snapshot.docs.slice(start, start + BATCH_LIMIT)) {
      batch.delete(entry.ref)
    }
    await batch.commit()
  }
}

/* ----------------------------- sync marker ----------------------------- */

/**
 * `users/{uid}/sync/homework` records that this account's pre-existing local
 * history has been merged into the cloud.
 *
 * Without it, a card deleted on one device would be pushed back up from
 * another device's stale local copy on every launch. With it, the merge happens
 * once and the cloud is authoritative from then on.
 */
export async function readMigrationMarker(uid: string): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  const snapshot = await getDoc(doc(db, 'users', uid, 'sync', 'homework'))
  return snapshot.exists() && Boolean(snapshot.data().homeworkMigratedAt)
}

export async function writeMigrationMarker(uid: string): Promise<void> {
  const db = getDb()
  if (!db) return
  await setDoc(doc(db, 'users', uid, 'sync', 'homework'), {
    homeworkMigratedAt: serverTimestamp(),
    schemaVersion: HOMEWORK_SCHEMA_VERSION
  })
}
