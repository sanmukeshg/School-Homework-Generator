import type { SubjectPreset } from '../types'

/**
 * Subject library. `color` is the label colour used on the generated homework
 * poster; the application UI shows the plain name.
 */
export const SUBJECT_PRESETS: Record<string, SubjectPreset> = {
  telugu: { name: 'Telugu', color: '#c81e1e' },
  hindi: { name: 'Hindi', color: '#1c64c8' },
  maths: { name: 'Maths', color: '#1a8c47' },
  english: { name: 'English', color: '#7c3aed' },
  science: { name: 'Science', color: '#e06010' },
  social: { name: 'Social Studies', color: '#b45309' },
  evs: { name: 'E.V.S', color: '#4d7c0f' },
  computer: { name: 'Computer', color: '#3730a3' },
  gk: { name: 'G.K', color: '#a16207' },
  art: { name: 'Art & Craft', color: '#be185d' },
  kannada: { name: 'Kannada', color: '#b91c1c' },
  tamil: { name: 'Tamil', color: '#c2410c' }
}

export const SUBJECT_KEYS = Object.keys(SUBJECT_PRESETS)

export const DEFAULT_SUBJECT_KEYS = ['telugu', 'hindi', 'maths']

export function getPreset(key: string): SubjectPreset {
  return SUBJECT_PRESETS[key] ?? { name: key || 'Subject', color: '#334155' }
}
