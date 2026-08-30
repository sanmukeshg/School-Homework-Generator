import { downloadBlob } from '../utils/file'

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded'

/** True when this browser can hand a PNG to the OS share sheet. */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', {
      type: 'image/png'
    })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/**
 * Primary action on the Preview screen: open the native share sheet with the
 * PNG attached so the teacher can pick the parents' WhatsApp group. Falls back
 * to a plain download when the platform has no file sharing (desktop browsers,
 * older Android WebViews).
 */
export async function sharePng(
  blob: Blob,
  filename: string,
  text: string
): Promise<ShareOutcome> {
  if (canShareFiles()) {
    const file = new File([blob], filename, { type: 'image/png' })
    try {
      // Title is the caption's first line, not the filename: some share
      // targets surface it as a subject.
      await navigator.share({ files: [file], title: text.split('\n')[0] || filename, text })
      return 'shared'
    } catch (error) {
      // The user swiping the sheet away rejects with AbortError — not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Anything else (NotAllowedError etc.): fall back to a download.
    }
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}

/** Share plain text only (used for the WhatsApp summary on supported phones). */
export async function shareText(text: string): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  return 'downloaded'
}
