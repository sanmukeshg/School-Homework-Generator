import { useEffect, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import {
  FEEDBACK_CATEGORIES,
  listMyFeedback,
  MAX_FEEDBACK_LENGTH,
  submitFeedback,
  type FeedbackCategory,
  type FeedbackItem
} from '../services/feedbackService'
import { formatDisplayDate } from '../utils/date'

interface FeedbackSheetProps {
  open: boolean
  onClose: () => void
}

const STATUS_WORDING: Record<string, string> = {
  new: 'Received',
  'under-review': 'Being looked at',
  planned: 'Planned',
  implemented: 'Done',
  dismissed: 'Not planned'
}

/**
 * A teacher's feedback: sending one, and seeing what happened to the last few.
 *
 * Only ever their own — the query is scoped to their uid, and the rules refuse
 * an unscoped read outright rather than quietly filtering it, so one teacher
 * cannot see another's however the request is shaped.
 */
export function FeedbackSheet({ open, onClose }: FeedbackSheetProps) {
  const { user } = useAuth()
  const { toast, warn } = useToast()
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<FeedbackCategory>('idea')
  const [mine, setMine] = useState<FeedbackItem[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setMessage('')
    setCategory('idea')
    void listMyFeedback(user.uid).then(setMine).catch(() => setMine([]))
  }, [open, user])

  async function send() {
    if (!user || busy) return
    const trimmed = message.trim()
    if (!trimmed) {
      warn('Write your feedback first')
      return
    }

    setBusy(true)
    try {
      await submitFeedback(user, trimmed, category)
      toast('Thank you — your feedback was sent')
      onClose()
    } catch {
      warn('That could not be sent. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      title="Send Feedback"
      subtitle="Ideas and problems both help"
      onClose={onClose}
      size="tall"
      footer={
        <button
          type="button"
          disabled={busy || !message.trim()}
          onClick={() => void send()}
          className="btn-primary w-full text-base"
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
      }
    >
      <div className="space-y-4 pb-2">
        <div>
          <p className="field-label">What is this about?</p>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_CATEGORIES.map((entry) => {
              const active = category === entry.id
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(entry.id)}
                  className={['choice-card', active ? 'choice-card-on' : ''].join(' ')}
                >
                  {entry.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="feedback-message">
            Your feedback
          </label>
          <textarea
            id="feedback-message"
            rows={5}
            maxLength={MAX_FEEDBACK_LENGTH}
            className="field resize-none"
            placeholder="Tell us what would make this easier for you."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <p className="mt-1.5 text-[11px] text-faint">
            {message.length}/{MAX_FEEDBACK_LENGTH} · sent with your name and email so we can reply
          </p>
        </div>

        {mine.length > 0 && (
          <div>
            <p className="field-label">What you have sent before</p>
            <ul className="space-y-2">
              {mine.slice(0, 5).map((item) => (
                <li key={item.id} className="rounded-2xl border border-line bg-surface-2 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="chip-accent">{STATUS_WORDING[item.status] ?? item.status}</span>
                    <span className="ml-auto text-[11px] text-faint">
                      {item.createdAt ? formatDisplayDate(item.createdAt) : ''}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-xs leading-relaxed text-muted">{item.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
