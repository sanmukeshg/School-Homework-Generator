import { openDB, type IDBPDatabase, type IDBPTransaction, type StoreNames } from 'idb'
import {
  DB_NAME,
  DB_VERSION,
  INDEX_BY_DATE,
  INDEX_BY_SLOT,
  STORE_CARDS,
  STORE_DRAFTS,
  STORE_META,
  STORE_SETTINGS,
  type AlmanacDB
} from './schema'
import type { HomeworkCard } from '../types'

type UpgradeTx = IDBPTransaction<AlmanacDB, StoreNames<AlmanacDB>[], 'versionchange'>

let dbPromise: Promise<IDBPDatabase<AlmanacDB>> | null = null

/**
 * Single shared connection. Everything in this app is local-only: there is no
 * network fallback and no sync, so this is the whole persistence story.
 */
export function getDB(): Promise<IDBPDatabase<AlmanacDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AlmanacDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(STORE_CARDS)) {
          const cards = db.createObjectStore(STORE_CARDS, { keyPath: 'id' })
          cards.createIndex(INDEX_BY_DATE, 'date')
          cards.createIndex(INDEX_BY_SLOT, ['date', 'classId', 'sectionId'])
        } else if (oldVersion < 2) {
          const cards = tx.objectStore(STORE_CARDS)
          if (!cards.indexNames.contains(INDEX_BY_SLOT)) {
            cards.createIndex(INDEX_BY_SLOT, ['date', 'classId', 'sectionId'])
          }
        }

        if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
          db.createObjectStore(STORE_DRAFTS, { keyPath: 'id' })
        }

        // v3. Deliberately left empty for an existing installation: unowned
        // data is claimed by the next account to sign in, which is what keeps
        // a teacher already using the app from losing anything.
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' })
        }

        // v1 records predate class/section. Keep them — their old date-based id
        // is still unique — and leave class/section blank so the teacher is
        // asked for them the next time the card is opened.
        if (oldVersion > 0 && oldVersion < 2) {
          void migrateV1Records(tx)
        }
      }
    })
  }
  return dbPromise
}

async function migrateV1Records(tx: UpgradeTx): Promise<void> {
  const cards = tx.objectStore(STORE_CARDS)
  for await (const cursor of cards.iterate()) {
    await cursor.update(normaliseCard(cursor.value))
  }

  const drafts = tx.objectStore(STORE_DRAFTS)
  for await (const cursor of drafts.iterate()) {
    await cursor.update({ ...cursor.value, card: normaliseCard(cursor.value.card) })
  }
}

/** Fills in fields added after v1 so old records are safe to read. */
export function normaliseCard(card: Partial<HomeworkCard> & { id: string }): HomeworkCard {
  return {
    id: card.id,
    date: card.date ?? '',
    displayDate: card.displayDate ?? '',
    day: card.day ?? '',
    classId: card.classId ?? '',
    sectionId: card.sectionId ?? '',
    lifeSkill: card.lifeSkill ?? '',
    word: card.word ?? '',
    meaning: card.meaning ?? '',
    synonym: card.synonym ?? '',
    showMeaning: card.showMeaning ?? true,
    announcement: card.announcement ?? '',
    items: card.items ?? [],
    createdAt: card.createdAt ?? Date.now(),
    updatedAt: card.updatedAt ?? Date.now()
  }
}

/**
 * Deletes every homework card and draft. School settings — name, initials,
 * logo, classes, sections, default subjects and the theme — are deliberately
 * left untouched.
 */
export async function clearHomeworkData(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction([STORE_CARDS, STORE_DRAFTS], 'readwrite')
  await Promise.all([
    tx.objectStore(STORE_CARDS).clear(),
    tx.objectStore(STORE_DRAFTS).clear(),
    tx.done
  ])
}

export { INDEX_BY_DATE, INDEX_BY_SLOT, STORE_CARDS, STORE_DRAFTS, STORE_META, STORE_SETTINGS }
