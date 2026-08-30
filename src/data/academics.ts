import type { ClassOption, SchoolSettings, SectionOption } from '../types'

/**
 * The single source of truth for classes and sections. Everything else reads
 * the lists off SchoolSettings (which start as these defaults), so a school can
 * add or remove entries from Settings without touching any component.
 */
export const DEFAULT_CLASSES: ClassOption[] = [
  { id: 'nursery', label: 'Nursery' },
  { id: 'lkg', label: 'LKG' },
  { id: 'ukg', label: 'UKG' },
  { id: 'class-1', label: 'Class 1' },
  { id: 'class-2', label: 'Class 2' },
  { id: 'class-3', label: 'Class 3' },
  { id: 'class-4', label: 'Class 4' },
  { id: 'class-5', label: 'Class 5' },
  { id: 'class-6', label: 'Class 6' },
  { id: 'class-7', label: 'Class 7' },
  { id: 'class-8', label: 'Class 8' },
  { id: 'class-9', label: 'Class 9' },
  { id: 'class-10', label: 'Class 10' }
]

export const DEFAULT_SECTIONS: SectionOption[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
  { id: 'd', label: 'D' }
]

/** Turns free text ("Class 11", "E") into a stable id. */
export function toOptionId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function classLabel(settings: SchoolSettings, classId: string): string {
  return settings.classes.find((item) => item.id === classId)?.label ?? ''
}

export function sectionLabel(settings: SchoolSettings, sectionId: string): string {
  return settings.sections.find((item) => item.id === sectionId)?.label ?? ''
}

/** True once the card is assigned to a real class and section. */
export function hasClassAndSection(card: { classId: string; sectionId: string }): boolean {
  return Boolean(card.classId && card.sectionId)
}

/** "Class 3 · B" — the short form used in lists. */
export function formatClassSection(
  settings: SchoolSettings,
  card: { classId: string; sectionId: string }
): string {
  const cls = classLabel(settings, card.classId)
  const section = sectionLabel(settings, card.sectionId)
  if (!cls && !section) return 'Class not set'
  if (!section) return cls
  return `${cls} · ${section}`
}

/** "CLASS 3 · SECTION B" — the prominent form printed on the card. */
export function formatClassSectionLong(
  settings: SchoolSettings,
  card: { classId: string; sectionId: string }
): string {
  const cls = classLabel(settings, card.classId)
  const section = sectionLabel(settings, card.sectionId)
  if (!cls) return ''
  return section ? `${cls} · Section ${section}` : cls
}
