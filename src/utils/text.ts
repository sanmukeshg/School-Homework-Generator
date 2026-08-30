/**
 * Removes a leading "Subject:" from a task so the subject is not printed twice
 * (the poster and the WhatsApp message already show it in their own column).
 *
 *   stripSubjectPrefix('Telugu: Test', 'Telugu')                -> 'Test'
 *   stripSubjectPrefix('Write an English paragraph', 'English') -> unchanged
 */
export function stripSubjectPrefix(task: string, subjectName: string): string {
  const text = task.trim()
  const name = subjectName.trim()
  if (!text || !name) return text

  // Names such as "E.V.S", "G.K" and "Art & Craft" contain regex metacharacters.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`^${escaped}\\s*:\\s*`, 'i').exec(text)
  return match ? text.slice(match[0].length).trim() : text
}
