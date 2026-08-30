import type { DBSchema } from 'idb'
import type { DraftRecord, HomeworkCard, SchoolSettings } from '../types'

export const DB_NAME = 'almanac-homework'

/**
 * v1 — one card per date, keyed by the date itself.
 * v2 — cards keyed by a generated id, with class + section, so a date can hold
 *      many cards (one per class/section).
 */
export const DB_VERSION = 2

export const STORE_SETTINGS = 'settings'
export const STORE_CARDS = 'cards'
export const STORE_DRAFTS = 'drafts'

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
}
