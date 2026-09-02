import { listCards, putCards } from './homeworkService'
import { loadSettings, saveSettings, withDefaults } from './settingsService'
import { clearHomeworkData, normaliseCard } from '../db'
import { cloudDeleteAllCards } from './cloudHomeworkService'
import { getActiveUid } from './session'
import { downloadBlob, readFileAsText } from '../utils/file'
import type { BackupFile, HomeworkCard } from '../types'
import { toDateKey } from '../utils/date'

/** Bumped alongside the IndexedDB schema: v2 adds class/section to each card. */
export const BACKUP_VERSION = 2

export async function buildBackup(): Promise<BackupFile> {
  const [settings, cards] = await Promise.all([loadSettings(), listCards()])
  return {
    app: 'almanac-homework',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    cards
  }
}

export async function exportBackup(): Promise<string> {
  const backup = await buildBackup()
  const filename = `Homework_Backup_${toDateKey(new Date())}.json`
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  downloadBlob(blob, filename)
  return filename
}

export interface RestoreResult {
  cards: number
  settingsRestored: boolean
}

/**
 * Merges a backup into the local database. Cards are keyed by their own id, so
 * restoring the same file twice is harmless. Version 1 backups (one card per
 * date, no class/section) are upgraded on the way in.
 */
export async function restoreBackup(file: Blob): Promise<RestoreResult> {
  const raw = await readFileAsText(file)
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const backup = parsed as Partial<BackupFile>
  if (!backup || backup.app !== 'almanac-homework' || !Array.isArray(backup.cards)) {
    throw new Error('That does not look like an Almanac backup file.')
  }

  const cards = backup.cards.filter(isValidCard).map((card) => normaliseCard(card))
  if (cards.length) await putCards(cards)

  let settingsRestored = false
  if (backup.settings && typeof backup.settings === 'object') {
    const current = await loadSettings()
    await saveSettings(withDefaults({ ...current, ...backup.settings }))
    settingsRestored = true
  }

  return { cards: cards.length, settingsRestored }
}

/** Clears homework only; the school configuration survives. */
export async function deleteAllHomework(): Promise<void> {
  await clearHomeworkData()

  // Signed in, "all homework" means the account's, not just this device's —
  // otherwise the next sync would pull it all back.
  const uid = getActiveUid()
  if (uid) await cloudDeleteAllCards(uid)
}

function isValidCard(value: unknown): value is HomeworkCard {
  if (!value || typeof value !== 'object') return false
  const card = value as HomeworkCard
  return typeof card.id === 'string' && typeof card.date === 'string' && Array.isArray(card.items)
}
