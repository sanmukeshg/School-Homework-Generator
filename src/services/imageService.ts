import { domToBlob } from 'modern-screenshot'
import { classLabel, sectionLabel } from '../data/academics'
import type { HomeworkCard, SchoolSettings } from '../types'

/** Natural (unscaled) width of the homework poster, in CSS pixels. */
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

/** Fonts, images and layout all settled before anything is captured. */
async function waitForRender(node: HTMLElement): Promise<void> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      /* non-fatal */
    }
  }

  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          })
    )
  )

  // Two frames: one for the layout to settle, one for it to be painted.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )
}

/**
 * Rasterises the poster the user is looking at, entirely on the device.
 *
 * `modern-screenshot` serialises the node into an SVG <foreignObject> and lets
 * the browser lay it out, so the PNG is the preview rendered by the same engine
 * — clip paths, gradients, borders and text metrics included. (html2canvas
 * reimplements CSS instead, which is what made the exported banner and section
 * offsets drift away from the preview.)
 *
 * The preview scales its wrapper for the phone screen; `style.transform` clears
 * that on the internal clone so the capture is always at natural size.
 */
export async function renderCardToBlob(node: HTMLElement, scale = EXPORT_SCALE): Promise<Blob> {
  await waitForRender(node)

  const width = node.offsetWidth || CARD_WIDTH
  const height = node.offsetHeight

  const blob = await domToBlob(node, {
    scale,
    width,
    height,
    type: 'image/png',
    // The poster paints its own background; this only fills the rounded corners.
    backgroundColor: 'transparent',
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      margin: '0'
    },
    timeout: 30000
  })

  if (!blob) throw new Error('The image could not be generated on this device.')
  return blob
}
