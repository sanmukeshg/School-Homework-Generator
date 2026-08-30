/** A single homework line on the card (one subject + one task). */
export interface HomeworkItem {
  id: string
  /** Key into SUBJECT_PRESETS. Drives colours, badge and book graphic. */
  subjectKey: string
  /** Display name — defaults to the preset name but can be overridden. */
  subjectName: string
  task: string
}

/** An entry in the school's class list (configurable in Settings). */
export interface ClassOption {
  id: string
  label: string
}

/** An entry in the school's section list (configurable in Settings). */
export interface SectionOption {
  id: string
  label: string
}

/**
 * One homework card. Identity is a generated `id`, never the date: a teacher
 * makes several cards a day, one per class/section. `date + classId + sectionId`
 * is the uniqueness rule enforced when saving.
 */
export interface HomeworkCard {
  id: string
  /** YYYY-MM-DD, local time. */
  date: string
  /** Human readable, e.g. "30 August 2026". */
  displayDate: string
  /** e.g. "Sunday" — derived from the date. */
  day: string
  classId: string
  sectionId: string
  lifeSkill: string
  word: string
  /** Optional meaning of the word of the day. */
  meaning: string
  synonym: string
  items: HomeworkItem[]
  createdAt: number
  updatedAt: number
}

export type ThemeName = 'light' | 'dark'

/** School branding and academic setup — entered once, reused every day. */
export interface SchoolSettings {
  id: 'settings'
  schoolName: string
  initials: string
  /** Data URL of the uploaded logo. Stored locally only. */
  logoDataUrl: string | null
  /** Subject keys pre-loaded when a new card is started. */
  defaultSubjects: string[]
  /** Central class list. Editable so a school can drop unused classes. */
  classes: ClassOption[]
  /** Central section list. */
  sections: SectionOption[]
  theme: ThemeName
  updatedAt: number
}

/** Work-in-progress copy of a card, keyed by the card's own id. */
export interface DraftRecord {
  id: string
  card: HomeworkCard
  updatedAt: number
}

export interface BackupFile {
  app: 'almanac-homework'
  version: number
  exportedAt: string
  settings: SchoolSettings | null
  cards: HomeworkCard[]
}

export interface SubjectPreset {
  name: string
  /** Label colour on the generated poster. */
  color: string
}
