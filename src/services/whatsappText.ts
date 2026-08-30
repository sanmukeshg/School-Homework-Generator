import { classLabel, sectionLabel } from '../data/academics'
import { resolveSubject } from '../data/subjects'
import type { HomeworkCard, SchoolSettings } from '../types'
import { stripSubjectPrefix } from '../utils/text'

/**
 * The caption that rides along with the shared image. Everything a parent
 * needs to identify the card is already printed on the poster, so this is
 * only school, class/section and date — never the homework itself.
 */
export function buildShareCaption(card: HomeworkCard, settings: SchoolSettings): string {
  const cls = classLabel(settings, card.classId)
  const section = sectionLabel(settings, card.sectionId)

  const lines = [settings.schoolName]
  if (cls) lines.push(section ? `${cls} — Section ${section}` : cls)
  lines.push(`${card.displayDate} — ${card.day}`)
  return lines.filter(Boolean).join('\n')
}

/** The full message behind 'Copy as WhatsApp Text'. */
export function buildWhatsAppText(card: HomeworkCard, settings: SchoolSettings): string {
  const cls = classLabel(settings, card.classId)
  const section = sectionLabel(settings, card.sectionId)

  const lines: string[] = []
  lines.push(`*${settings.schoolName}*`)
  lines.push('')
  if (cls) lines.push(section ? `*${cls} — Section ${section}*` : `*${cls}*`)
  lines.push(`${card.displayDate} — ${card.day}`)
  lines.push('')
  lines.push('*Life Skill:*')
  lines.push(card.lifeSkill)
  lines.push('')
  lines.push('*Word of the Day:*')
  lines.push(card.word)
  if (card.showMeaning !== false && card.meaning.trim()) {
    lines.push('')
    lines.push('*Meaning:*')
    lines.push(card.meaning)
  }
  if (card.synonym.trim()) {
    lines.push('')
    lines.push('*Synonym:*')
    lines.push(card.synonym)
  }
  lines.push('')
  lines.push('*HOMEWORK*')

  const items = card.items.filter((item) => item.task.trim())
  if (items.length === 0) {
    lines.push('No homework today.')
  } else {
    for (const item of items) {
      const name = item.subjectName || resolveSubject(settings, item.subjectKey).name
      lines.push(`${name}: ${stripSubjectPrefix(item.task, name)}`)
    }
  }

  if (card.announcement?.trim()) {
    lines.push('')
    lines.push('*ANNOUNCEMENT*')
    lines.push(card.announcement.trim())
  }

  lines.push('')
  lines.push('_Please ensure all assignments are completed in their respective workbooks._')
  return lines.join('\n')
}

/** Clipboard write with a fallback for browsers without the async API. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
