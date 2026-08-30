import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { TopBar } from '../components/TopBar'
import { PencilIcon, TrashIcon } from '../components/icons'
import { ScaledCard } from '../components/card/CardStage'
import { formatClassSection } from '../data/academics'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { deleteCard, getCard, getDraft } from '../services/homeworkService'
import { buildFileName, renderCardToBlob } from '../services/imageService'
import { canShareFiles, sharePng } from '../services/shareService'
import { buildShareCaption, buildWhatsAppText, copyToClipboard } from '../services/whatsappText'
import { downloadBlob } from '../utils/file'
import type { HomeworkCard } from '../types'

type Busy = 'share' | 'download' | null

interface PreviewPageProps {
  cardId: string
}

export function PreviewPage({ cardId }: PreviewPageProps) {
  const navigate = useNavigate()
  const { settings, ready } = useSettings()
  const { toast, warn } = useToast()

  const cardRef = useRef<HTMLDivElement>(null)
  const [card, setCard] = useState<HomeworkCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Busy>(null)
  const [downloadedName, setDownloadedName] = useState<string | null>(null)
  const [askDelete, setAskDelete] = useState(false)

  const nativeShare = canShareFiles()

  useEffect(() => {
    let cancelled = false

    async function load() {
      // A draft is what the teacher last typed, so it wins over the saved copy.
      const [saved, draft] = await Promise.all([getCard(cardId), getDraft(cardId)])
      if (cancelled) return
      setCard(draft?.card ?? saved ?? null)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [cardId])

  async function generate(): Promise<{ blob: Blob; filename: string } | null> {
    const node = cardRef.current
    if (!node || !card) return null
    const blob = await renderCardToBlob(node)
    return { blob, filename: buildFileName(card, settings) }
  }

  async function handleShare() {
    if (busy) return
    setBusy('share')
    try {
      const result = await generate()
      if (!result || !card) return
      const caption = buildShareCaption(card, settings)
      const outcome = await sharePng(result.blob, result.filename, caption)

      if (outcome === 'shared') toast('Shared')
      else if (outcome === 'downloaded') {
        setDownloadedName(result.filename)
        toast('Image downloaded')
      }
    } catch (error) {
      console.error(error)
      warn('Could not create the image. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDownload() {
    if (busy) return
    setBusy('download')
    try {
      const result = await generate()
      if (!result) return
      downloadBlob(result.blob, result.filename)
      setDownloadedName(result.filename)
      toast('Image downloaded')
    } catch (error) {
      console.error(error)
      warn('Could not create the image. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  /** Removes this card and its draft only, then returns to the dashboard. */
  async function handleDelete() {
    if (!card) return
    setAskDelete(false)
    await deleteCard(card.id)
    toast('Homework deleted')
    navigate('/', { replace: true })
  }

  async function handleCopyText() {
    if (!card) return
    const ok = await copyToClipboard(buildWhatsAppText(card, settings))
    if (ok) toast('WhatsApp text copied')
    else warn('Could not copy the text on this browser')
  }

  if (loading || !ready) {
    return (
      <div className="screen">
        <TopBar title="Preview" back />
        <div className="screen-body pt-10 text-center text-sm text-muted">Loading…</div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="screen">
        <TopBar title="Preview" back />
        <div className="screen-body pt-10 text-center">
          <p className="text-sm text-muted">That homework card could not be found.</p>
          <button type="button" onClick={() => navigate('/new')} className="btn-primary mx-auto mt-4">
            Create a new one
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar
        title="Preview"
        subtitle={`${formatClassSection(settings, card)} · ${card.displayDate}`}
        back
        right={
          <>
            <button
              type="button"
              aria-label="Edit Homework"
              title="Edit Homework"
              onClick={() => navigate(`/edit/${card.id}`)}
              className="icon-btn"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              aria-label="Delete Homework"
              title="Delete Homework"
              onClick={() => setAskDelete(true)}
              className="icon-btn-danger"
            >
              <TrashIcon />
            </button>
          </>
        }
      />

      <div className="screen-body pt-4">
        {/* The preview node itself is the capture source. */}
        <ScaledCard ref={cardRef} card={card} settings={settings} />

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="btn-secondary w-full"
            disabled={busy !== null}
          >
            {busy === 'download' ? 'Generating…' : 'Download PNG'}
          </button>
          <button type="button" onClick={() => void handleCopyText()} className="btn-secondary w-full">
            Copy as WhatsApp Text
          </button>
        </div>

        {!nativeShare && (
          <p className="mt-4 rounded-2xl border border-line bg-surface p-3 text-xs leading-relaxed text-muted">
            This browser cannot open the phone&apos;s share sheet, so Share saves the PNG to your
            downloads instead. Open WhatsApp, pick the parents&apos; group, tap the attachment
            button and choose the saved image.
          </p>
        )}

        {downloadedName && (
          <p className="mt-3 text-center text-[11px] text-muted">
            Saved as <span className="font-bold text-ink">{downloadedName}</span>
          </p>
        )}
      </div>

      <div className="sticky-actions">
        <button
          type="button"
          onClick={() => void handleShare()}
          className="btn-primary w-full text-base"
          disabled={busy !== null}
        >
          {busy === 'share' ? 'Generating image…' : 'Share to WhatsApp'}
        </button>
      </div>

      <ConfirmSheet
        open={askDelete}
        title="Delete Homework?"
        message={`Are you sure you want to delete the ${formatClassSection(settings, card)} homework for ${card.displayDate}? Other cards are not affected.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setAskDelete(false)}
      />

    </div>
  )
}
