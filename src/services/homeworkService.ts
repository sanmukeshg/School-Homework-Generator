import { getDB, INDEX_BY_DATE, INDEX_BY_SLOT, normaliseCard, STORE_CARDS, STORE_DRAFTS } from '../db'
import { getPreset } from '../data/subjects'
import { LIFE_SKILLS } from '../data/lifeSkills'
import { VOCABULARY_LIST } from '../data/vocabulary'
import type { DraftRecord, HomeworkCard, HomeworkItem, SchoolSettings } from '../types'
import { dayName, formatDisplayDate, fromDateKey } from '../utils/date'
import { uid } from '../utils/id'

/** Builds a fresh, unsaved card. Class and section start empty on purpose. */
export function createEmptyCard(
  dateKey: string,
  settings: SchoolSettings,
  id = uid('card')
): HomeworkCard {
  const date = fromDateKey(dateKey)
  const now = Date.now()
  return {
    id,
    date: dateKey,
    displayDate: formatDisplayDate(date),
    day: dayName(date),
    classId: '',
    sectionId: '',
    lifeSkill: LIFE_SKILLS[0],
    word: VOCABULARY_LIST[0].word,
    meaning: VOCABULARY_LIST[0].meaning,
    synonym: VOCABULARY_LIST[0].syn,
    showMeaning: true,
    announcement: '',
    items: settings.defaultSubjects.map((key) => createItem(key)),
    createdAt: now,
    updatedAt: now
  }
}

export function createItem(subjectKey: string, task = ''): HomeworkItem {
  return {
    id: uid('hw'),
    subjectKey,
    subjectName: getPreset(subjectKey).name,
    task
  }
}

export async function getCard(id: string): Promise<HomeworkCard | undefined> {
  const db = await getDB()
  const card = await db.get(STORE_CARDS, id)
  return card ? normaliseCard(card) : undefined
}

/** Newest date first, then class/section — the order History wants. */
export async function listCards(): Promise<HomeworkCard[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_CARDS)
  return all.map(normaliseCard).sort(compareCards)
}

/** Every card saved for one date (all classes and sections). */
export async function listCardsForDate(dateKey: string): Promise<HomeworkCard[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex(STORE_CARDS, INDEX_BY_DATE, dateKey)
  return all.map(normaliseCard).sort(compareCards)
}

/**
 * The uniqueness lookup: one card per date + class + section. Returns the
 * existing card so the UI can offer to open it instead of duplicating.
 */
export async function findCardBySlot(
  date: string,
  classId: string,
  sectionId: string
): Promise<HomeworkCard | undefined> {
  if (!date || !classId || !sectionId) return undefined
  const db = await getDB()
  const found = await db.getFromIndex(STORE_CARDS, INDEX_BY_SLOT, [date, classId, sectionId])
  return found ? normaliseCard(found) : undefined
}

/** The card that would clash with `card`, if any. */
export async function findConflict(card: HomeworkCard): Promise<HomeworkCard | undefined> {
  const existing = await findCardBySlot(card.date, card.classId, card.sectionId)
  return existing && existing.id !== card.id ? existing : undefined
}

export async function saveCard(card: HomeworkCard): Promise<HomeworkCard> {
  const db = await getDB()
  const existing = await db.get(STORE_CARDS, card.id)
  const next: HomeworkCard = {
    ...card,
    createdAt: existing?.createdAt ?? card.createdAt ?? Date.now(),
    updatedAt: Date.now()
  }
  await db.put(STORE_CARDS, next)
  // The saved copy is now the source of truth; the draft is no longer needed.
  await db.delete(STORE_DRAFTS, card.id)
  return next
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_CARDS, id)
  await db.delete(STORE_DRAFTS, id)
}

export async function putCards(cards: HomeworkCard[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE_CARDS, 'readwrite')
  await Promise.all(cards.map((card) => tx.store.put(card)))
  await tx.done
}

/* ------------------------------ drafts ------------------------------ */

export async function saveDraft(card: HomeworkCard): Promise<void> {
  const db = await getDB()
  const record: DraftRecord = { id: card.id, card, updatedAt: Date.now() }
  await db.put(STORE_DRAFTS, record)
}

export async function getDraft(id: string): Promise<DraftRecord | undefined> {
  const db = await getDB()
  const draft = await db.get(STORE_DRAFTS, id)
  return draft ? { ...draft, card: normaliseCard(draft.card) } : undefined
}

export async function listDrafts(): Promise<DraftRecord[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_DRAFTS)
  return all.map((draft) => ({ ...draft, card: normaliseCard(draft.card) }))
}

export async function clearDraft(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_DRAFTS, id)
}

/** True when the draft differs from what was saved, i.e. worth restoring. */
export function isMeaningfulDraft(draft: HomeworkCard, saved?: HomeworkCard): boolean {
  if (!saved) return true
  return JSON.stringify(stripTimestamps(draft)) !== JSON.stringify(stripTimestamps(saved))
}

function stripTimestamps(card: HomeworkCard) {
  const clone: Partial<HomeworkCard> = { ...card }
  delete clone.createdAt
  delete clone.updatedAt
  return clone
}

export function countFilledItems(card: HomeworkCard): number {
  return card.items.filter((item) => item.task.trim().length > 0).length
}

/** The uniqueness key: date + class + section. */
function slotKey(card: HomeworkCard): string {
  return [card.date, card.classId, card.sectionId].join('|')
}

function compareCards(a: HomeworkCard, b: HomeworkCard): number {
  if (a.date !== b.date) return b.date.localeCompare(a.date)
  if (a.classId !== b.classId) return a.classId.localeCompare(b.classId)
  return a.sectionId.localeCompare(b.sectionId)
}

/* ---------------------- today's dashboard entries ---------------------- */

export interface DashboardEntry {
  card: HomeworkCard
  status: 'saved' | 'draft'
}

/**
 * What Home lists for a date: every saved card, plus drafts for cards that were
 * never saved, so unfinished work is never invisible.
 */
export async function listEntriesForDate(dateKey: string): Promise<DashboardEntry[]> {
  const [saved, drafts] = await Promise.all([listCardsForDate(dateKey), listDrafts()])
  const savedIds = new Set(saved.map((card) => card.id))
  const savedSlots = new Set(saved.map(slotKey))

  const entries: DashboardEntry[] = saved.map((card) => ({ card, status: 'saved' as const }))
  for (const draft of drafts) {
    if (draft.card.date !== dateKey || savedIds.has(draft.id)) continue
    // An abandoned draft for a slot that is already saved would only confuse.
    if (savedSlots.has(slotKey(draft.card))) continue
    entries.push({ card: draft.card, status: 'draft' })
  }

  return entries.sort((a, b) => compareCards(a.card, b.card))
}
