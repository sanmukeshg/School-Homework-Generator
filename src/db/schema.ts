import type { DBSchema } from 'idb'
import type { DraftRecord, HomeworkCard, SchoolSettings } from '../types'

export const DB_NAME = 'almanac-homework'

/**
 * v1 — one card per date, keyed by the date itself.
 * v2 — cards keyed by a generated id, with class + section, so a date can hold
 *      many cards (one per class/section).
 * v3 — a meta store recording which account the cached data belongs to, so a
 *      second account signing in on the same phone cannot inherit the first
 *      one's homework and settings.
 */
export const DB_VERSION = 3

export const STORE_SETTINGS = 'settings'
export const STORE_CARDS = 'cards'
export const STORE_DRAFTS = 'drafts'
export const STORE_META = 'meta'

/** Key in the meta store holding the uid this cache belongs to. */
export const META_CACHE_OWNER = 'cache-owner'

export const INDEX_BY_DATE = 'by-date'
/** [date, classId, sectionId] — the uniqueness rule for a card. */
export const INDEX_BY_SLOT = 'by-slot'

export interface AlmanacDB extends DBSchema {
  [STORE_SETTINGS]: {
    key: string
    value: SchoolSettings
  }
  [STORE_CARDS]: {
    key: string
    value: HomeworkCard
    indexes: {
      [INDEX_BY_DATE]: string
      [INDEX_BY_SLOT]: [string, string, string]
    }
  }
  [STORE_DRAFTS]: {
    key: string
    value: DraftRecord
  }
  /**
   * Small bookkeeping records about the cache itself, never about homework.
   * Lives in the same database on purpose: if the database is deleted the
   * ownership record goes with the data it describes, so the two can never
   * disagree the way two separate stores could.
   */
  [STORE_META]: {
    key: string
    value: { key: string; value: string | null; updatedAt: number }
  }
}
