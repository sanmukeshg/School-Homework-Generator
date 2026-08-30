import html2canvas from 'html2canvas'
import { classLabel, sectionLabel } from '../data/academics'
import type { HomeworkCard, SchoolSettings } from '../types'

/** Natural (unscaled) width of the almanac card, in CSS pixels. */
export const CARD_WIDTH = 520

/** 2.5x gives a ~1300px wide PNG — crisp on every phone, small enough for WhatsApp. */
export const EXPORT_SCALE = 2.5

/**
 * `Homework_Class_3_B_30_August_2026.png`. Falls back to a date-only name
 * when the card has not been assigned a class yet.
 */
export function buildFileName(card: HomeworkCard, settings: SchoolSettings): string {
  const parts = [
    classLabel(settings, card.classId),
    sectionLabel(settings, card.sectionId),
    card.displayDate || card.date
  ]

  const safe = parts
    .map((part) => part.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
    .filter(Boolean)
    .join('_')

  return `Homework_${safe}.png`
}

/**
 * Rasterises the card node into a PNG blob, entirely on the device.
 *
 * The node lives on an off-screen stage so the visible preview can be scaled to
 * fit the phone without affecting the export. html2canvas crops to the element's
 * box inside its cloned document, so the clone's stage is moved back on-screen
 * (and lifted above everything) before painting.
 */
export async function renderCardToBlob(node: HTMLElement, scale = EXPORT_SCALE): Promise<Blob> {
  // Web fonts must be resolved or html2canvas paints fallback glyphs.
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      /* non-fatal */
    }
  }

  const canvas = await html2canvas(node, {
    scale,
    backgroundColor: '#0b1928',
    useCORS: true,
    logging: false,
    imageTimeout: 15000,
    windowWidth: CARD_WIDTH + 80,
    windowHeight: Math.max(node.scrollHeight + 80, 1000),
    onclone: (doc) => {
      const stage = doc.querySelector<HTMLElement>('[data-capture-stage]')
      if (stage) {
        stage.style.position = 'absolute'
        stage.style.left = '0px'
        stage.style.top = '0px'
        stage.style.zIndex = '2147483647'
        stage.style.pointerEvents = 'none'
      }
    }
  })

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/png')
  })

  if (!blob) throw new Error('The image could not be generated on this device.')
  return blob
}
