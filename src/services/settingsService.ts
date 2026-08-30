import { getDB, STORE_SETTINGS } from '../db'
import { DEFAULT_CLASSES, DEFAULT_SECTIONS } from '../data/academics'
import { DEFAULT_SUBJECT_KEYS } from '../data/subjects'
import { DEFAULT_THEME, normaliseTheme } from './themeService'
import type { SchoolSettings } from '../types'

/** A blank school: the first-use screen fills these in. */
export const DEFAULT_SETTINGS: SchoolSettings = {
  id: 'settings',
  schoolName: '',
  initials: '',
  logoDataUrl: null,
  defaultSubjects: DEFAULT_SUBJECT_KEYS,
  classes: DEFAULT_CLASSES,
  sections: DEFAULT_SECTIONS,
  customSubjects: [],
  removedSubjects: [],
  theme: DEFAULT_THEME,
  updatedAt: 0
}

/**
 * Merges stored settings over the defaults so new fields appear on old data —
 * and drops fields that no longer exist (the retired crest subtitle) or whose
 * values were retired (the 'night' and 'system' themes).
 */
export function withDefaults(stored?: Partial<SchoolSettings> | null): SchoolSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(stored ?? {}) } as SchoolSettings &
    Record<string, unknown>
  delete merged.badgeSubtext

  return {
    id: 'settings',
    schoolName: merged.schoolName,
    initials: merged.initials,
    logoDataUrl: merged.logoDataUrl ?? null,
    defaultSubjects: merged.defaultSubjects?.length ? merged.defaultSubjects : DEFAULT_SUBJECT_KEYS,
    classes: merged.classes?.length ? merged.classes : DEFAULT_CLASSES,
    sections: merged.sections?.length ? merged.sections : DEFAULT_SECTIONS,
    customSubjects: merged.customSubjects ?? [],
    removedSubjects: merged.removedSubjects ?? [],
    // A stored preference wins; anything unknown falls back to Light.
    theme: stored && 'theme' in stored ? normaliseTheme(stored.theme) : DEFAULT_THEME,
    updatedAt: merged.updatedAt ?? 0
  }
}

/** True once the teacher has told us which school this is. */
export function isSchoolConfigured(settings: SchoolSettings): boolean {
  return settings.schoolName.trim().length > 0 && settings.initials.trim().length > 0
}

export async function loadSettings(): Promise<SchoolSettings> {
  const db = await getDB()
  const stored = await db.get(STORE_SETTINGS, 'settings')
  return withDefaults(stored)
}

export async function saveSettings(settings: SchoolSettings): Promise<SchoolSettings> {
  const db = await getDB()
  const next = withDefaults({ ...settings, updatedAt: Date.now() })
  await db.put(STORE_SETTINGS, next)
  return next
}
