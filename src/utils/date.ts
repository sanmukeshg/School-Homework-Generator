const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** YYYY-MM-DD in the phone's own timezone (never UTC — days must not shift). */
export function toDateKey(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** "30 August 2026" */
export function formatDisplayDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function dayName(date: Date): string {
  return DAYS[date.getDay()]
}

/** "30 Aug" — used in the history list. */
export function formatShortDate(key: string): string {
  const d = fromDateKey(key)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

/** "August 2026" — history month headings. */
export function formatMonthLabel(key: string): string {
  const d = fromDateKey(key)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function isToday(key: string): boolean {
  return key === todayKey()
}

export function relativeDayLabel(key: string): string {
  const today = todayKey()
  if (key === today) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === toDateKey(yesterday)) return 'Yesterday'
  return formatShortDate(key)
}
