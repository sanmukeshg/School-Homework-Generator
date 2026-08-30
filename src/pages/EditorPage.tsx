import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { TopBar } from '../components/TopBar'
import { ScaledCard } from '../components/card/CardStage'
import { formatClassSection } from '../data/academics'
import { listSubjects } from '../data/subjects'
import { randomLifeSkill } from '../data/lifeSkills'
import { randomVocabulary } from '../data/vocabulary'
import { useCardEditor } from '../hooks/useCardEditor'
import { clearDraft } from '../services/homeworkService'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import type { HomeworkCard } from '../types'
import { todayKey } from '../utils/date'

interface EditorPageProps {
  cardId: string
}

export function EditorPage({ cardId }: EditorPageProps) {
  const location = useLocation()
  const isNew = Boolean((location.state as { isNew?: boolean } | null)?.isNew)

  const navigate = useNavigate()
  const { settings, ready } = useSettings()
  const { toast, warn } = useToast()
  const [showPreview, setShowPreview] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  // Guards against a double tap or rapid navigation queueing two saves.
  const saving = useRef(false)

  const editor = useCardEditor(cardId, todayKey(), settings, ready)
  const { card, conflict } = editor

  if (editor.loading || !card) {
    return (
      <div className="screen">
        <TopBar title="Homework" back />
        <div className="screen-body pt-10 text-center text-sm text-muted">Loading…</div>
      </div>
    )
  }

  /** Everything the card must have before it can be saved or shared. */
  function validate(current: HomeworkCard): string | null {
    if (!current.classId) return 'Select a class first'
    if (!current.sectionId) return 'Select a section first'
    if (!current.word.trim()) return 'Enter the word of the day'
    if (current.showMeaning && !current.meaning.trim()) {
      return 'Enter the meaning, or switch it off'
    }
    if (!current.synonym.trim()) return 'Enter a synonym'
    return null
  }

  async function handleSave(thenPreview: boolean) {
    if (saving.current || !card) return
    const problem = validate(card)
    if (problem) {
      warn(problem)
      return
    }

    saving.current = true
    try {
      const result = await editor.save()
      if (!result.ok) {
        setConflictOpen(true)
        return
      }
      toast('Homework saved')
      if (thenPreview) navigate(`/preview/${result.card.id}`)
    } finally {
      saving.current = false
    }
  }

  async function openExisting(existing: HomeworkCard) {
    setConflictOpen(false)
    // The card being abandoned was never saved — drop its draft so it does not
    // linger on Home behind the card the teacher actually wanted.
    if (isNew) await clearDraft(cardId)
    navigate(`/edit/${existing.id}`, { replace: true })
  }

  return (
    <div className="screen">
      <TopBar
        title={isNew ? 'New Homework' : 'Edit Homework'}
        subtitle={`${formatClassSection(settings, card)} · ${card.displayDate}`}
        back
        right={editor.dirty ? <span className="chip-accent">Draft</span> : null}
      />

      <div className="screen-body space-y-4 pt-4">
        {editor.restoredDraft && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/50 bg-accent/10 p-3 text-xs text-accent">
            <span>Unsaved work from last time was restored.</span>
            <button
              type="button"
              onClick={() => void editor.discardDraft()}
              className="flex-shrink-0 rounded-lg border border-accent/50 px-2.5 py-2 font-semibold"
            >
              Discard
            </button>
          </div>
        )}

        {conflict && (
          <div className="rounded-2xl border border-danger/50 p-3 text-xs text-danger" role="alert">
            <p className="font-semibold">
              {formatClassSection(settings, card)} already has a card for {card.displayDate}.
            </p>
            <button
              type="button"
              onClick={() => void openExisting(conflict)}
              className="mt-2 rounded-lg border border-danger/50 px-3 py-2 font-semibold"
            >
              Open existing
            </button>
          </div>
        )}

        {/* 1. Class, section and date — the first decision every day */}
        <section className="panel">
          <h2 className="panel-title mb-3">Class &amp; Date</h2>

          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="class-select">
                Class
              </label>
              <select
                id="class-select"
                className="select"
                value={card.classId}
                onChange={(event) => editor.patch({ classId: event.target.value })}
              >
                <option value="">Select Class</option>
                {settings.classes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="section-select">
                Section
              </label>
              <select
                id="section-select"
                className="select"
                value={card.sectionId}
                onChange={(event) => editor.patch({ sectionId: event.target.value })}
              >
                <option value="">Select Section</option>
                {settings.sections.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="field-label" htmlFor="date-input">
              Date
            </label>
            <input
              id="date-input"
              type="date"
              className="field"
              value={card.date}
              onChange={(event) => event.target.value && editor.setDate(event.target.value)}
            />
            <p className="mt-2 text-xs text-muted">
              On the card: <span className="font-semibold text-ink">{card.displayDate}</span> (
              {card.day})
            </p>
          </div>
        </section>

        {/* 2. Life skill */}
        <section className="panel">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="panel-title">Life Skill</h2>
            <button
              type="button"
              onClick={() => editor.patch({ lifeSkill: randomLifeSkill(card.lifeSkill) })}
              className="btn-chip"
            >
              Random Idea
            </button>
          </div>
          <textarea
            rows={3}
            className="field resize-none"
            placeholder="Enter an inspirational life skill or moral value…"
            value={card.lifeSkill}
            onChange={(event) => editor.patch({ lifeSkill: event.target.value })}
          />
        </section>

        {/* 3. Word of the day — word, meaning and synonym belong together */}
        <section className="panel">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="panel-title">Word of the Day</h2>
            <button
              type="button"
              onClick={() => {
                const picked = randomVocabulary(card.word)
                editor.patch({
                  word: picked.word,
                  meaning: picked.meaning,
                  synonym: picked.syn
                })
              }}
              className="btn-chip"
            >
              Random Word
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="field-label" htmlFor="word-input">
                New word
              </label>
              <input
                id="word-input"
                type="text"
                className="field font-medium"
                value={card.word}
                onChange={(event) => editor.patch({ word: event.target.value })}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="field-label mb-0" htmlFor="meaning-input">
                  Meaning
                </label>
                {/* Off leaves the meaning out of the card entirely; the word
                    and synonym then share the space. */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={card.showMeaning}
                  onClick={() => editor.patch({ showMeaning: !card.showMeaning })}
                  className={[
                    'min-h-[36px] rounded-full border px-3 text-[11px] font-semibold transition active:scale-95',
                    card.showMeaning
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line bg-surface-2 text-muted'
                  ].join(' ')}
                >
                  {card.showMeaning ? '✓ Included' : 'Excluded'}
                </button>
              </div>
              {card.showMeaning ? (
                <textarea
                  id="meaning-input"
                  rows={2}
                  className="field resize-none"
                  placeholder="A wish or goal that we hope to achieve."
                  value={card.meaning}
                  onChange={(event) => editor.patch({ meaning: event.target.value })}
                />
              ) : (
                <p className="rounded-xl border border-dashed border-line px-3.5 py-3 text-xs text-muted">
                  The meaning will not appear on the card.
                </p>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor="synonym-input">
                Synonym
              </label>
              <input
                id="synonym-input"
                type="text"
                className="field font-medium"
                value={card.synonym}
                onChange={(event) => editor.patch({ synonym: event.target.value })}
              />
            </div>
          </div>
        </section>

        {/* 4. Homework */}
        <section className="panel">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="panel-title">Homework</h2>
            <span className="text-xs text-muted">{card.items.length} subjects</span>
          </div>

          <div className="space-y-3">
            {card.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-line bg-surface-2 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <select
                    aria-label="Subject"
                    className="select flex-1"
                    value={item.subjectKey}
                    onChange={(event) => editor.changeSubject(item.id, event.target.value)}
                  >
                    {listSubjects(settings).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.preset.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    aria-label={`Remove ${item.subjectName}`}
                    title={`Remove ${item.subjectName}`}
                    onClick={() => editor.removeItem(item.id)}
                    className="btn-remove"
                  >
                    −
                  </button>
                </div>

                <textarea
                  rows={2}
                  className="field resize-none text-[15px]"
                  placeholder="e.g. Complete pg. no: 16 in CWB."
                  value={item.task}
                  onChange={(event) => editor.updateItem(item.id, { task: event.target.value })}
                />
              </div>
            ))}
          </div>

          <button type="button" onClick={editor.addItem} className="btn-secondary mt-3 w-full">
            Add Subject
          </button>
        </section>

        {/* 5. Announcement — optional notice printed under the homework */}
        <section className="panel">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="panel-title">Announcement</h2>
            <span className="text-[11px] text-faint">Optional</span>
          </div>
          <p className="mb-3 text-xs text-muted">
            Anything important for parents. Left blank, it does not appear on the card.
          </p>
          <textarea
            id="announcement-input"
            rows={2}
            className="field resize-none"
            placeholder="e.g. Bring your science notebook tomorrow."
            value={card.announcement}
            onChange={(event) => editor.patch({ announcement: event.target.value })}
          />
        </section>

        {/* 6. Preview */}
        <section className="panel">
          <button
            type="button"
            onClick={() => setShowPreview((value) => !value)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="panel-title">Live Preview</h2>
            <span className="text-xs font-semibold text-accent">
              {showPreview ? 'Hide' : 'Show'}
            </span>
          </button>

          {showPreview && (
            <div className="mt-3">
              <ScaledCard card={card} settings={settings} />
            </div>
          )}
        </section>
      </div>

      <div className="sticky-actions flex gap-2">
        <button type="button" onClick={() => void handleSave(false)} className="btn-secondary flex-1">
          Save
        </button>
        <button type="button" onClick={() => void handleSave(true)} className="btn-primary flex-[1.4]">
          Preview &amp; Share
        </button>
      </div>

      <Modal
        open={conflictOpen && Boolean(conflict)}
        title="Homework already exists"
        onClose={() => setConflictOpen(false)}
        actions={
          <>
            <button
              type="button"
              onClick={() => conflict && void openExisting(conflict)}
              className="btn-primary w-full"
            >
              Open Existing
            </button>
            <button
              type="button"
              onClick={() => setConflictOpen(false)}
              className="btn-ghost w-full"
            >
              Cancel
            </button>
          </>
        }
      >
        Homework for {formatClassSection(settings, card)} already exists for {card.displayDate}.
      </Modal>
    </div>
  )
}
