import type { CustomSubject, SchoolSettings, SubjectPreset } from '../types'

/**
 * Built-in subjects. `color` is the label colour on the generated poster and
 * `glyph` picks the small illustration drawn beside it.
 */
export const SUBJECT_PRESETS: Record<string, SubjectPreset> = {
  telugu: { name: 'Telugu', color: '#c81e1e', glyph: 'language' },
  hindi: { name: 'Hindi', color: '#1c64c8', glyph: 'language' },
  maths: { name: 'Maths', color: '#1a8c47', glyph: 'maths' },
  english: { name: 'English', color: '#7c3aed', glyph: 'book' },
  science: { name: 'Science', color: '#e06010', glyph: 'science' },
  social: { name: 'Social Studies', color: '#b45309', glyph: 'globe' },
  evs: { name: 'E.V.S', color: '#4d7c0f', glyph: 'leaf' },
  computer: { name: 'Computer', color: '#3730a3', glyph: 'computer' },
  gk: { name: 'G.K', color: '#a16207', glyph: 'bulb' },
  art: { name: 'Art & Craft', color: '#be185d', glyph: 'art' },
  kannada: { name: 'Kannada', color: '#b91c1c', glyph: 'language' },
  tamil: { name: 'Tamil', color: '#c2410c', glyph: 'language' }
}

export const SUBJECT_KEYS = Object.keys(SUBJECT_PRESETS)

export const DEFAULT_SUBJECT_KEYS = ['telugu', 'hindi', 'maths']

/** Colours handed out to subjects the school adds itself. */
export const CUSTOM_SUBJECT_COLORS = [
  '#0f766e',
  '#9333ea',
  '#b45309',
  '#0369a1',
  '#be123c',
  '#4d7c0f'
]

export function nextCustomColor(existing: CustomSubject[]): string {
  return CUSTOM_SUBJECT_COLORS[existing.length % CUSTOM_SUBJECT_COLORS.length]
}

export function getPreset(key: string): SubjectPreset {
  return SUBJECT_PRESETS[key] ?? { name: key || 'Subject', color: '#334155', glyph: 'book' }
}

/**
 * The full subject list a card can choose from: the built-ins plus anything
 * added under Settings. Everything downstream — editor, poster, WhatsApp text —
 * resolves through here so a custom subject behaves like a built-in one.
 */
export function listSubjects(settings: SchoolSettings): { id: string; preset: SubjectPreset }[] {
  const removed = new Set(settings.removedSubjects ?? [])
  const builtIns = SUBJECT_KEYS.filter((id) => !removed.has(id)).map((id) => ({
    id,
    preset: SUBJECT_PRESETS[id]
  }))
  const custom = (settings.customSubjects ?? []).map((item) => ({
    id: item.id,
    preset: { name: item.label, color: item.color, glyph: 'book' } as SubjectPreset
  }))
  return [...builtIns, ...custom]
}

export function isBuiltInSubject(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(SUBJECT_PRESETS, id)
}

export function resolveSubject(settings: SchoolSettings, key: string): SubjectPreset {
  const custom = (settings.customSubjects ?? []).find((item) => item.id === key)
  if (custom) return { name: custom.label, color: custom.color, glyph: 'book' }
  return getPreset(key)
}
