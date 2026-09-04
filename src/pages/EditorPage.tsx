import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BasicDetailsFields } from '../components/BasicDetailsFields'
import { Modal } from '../components/Modal'
import { StepIndicator } from '../components/StepIndicator'
import { TopBar } from '../components/TopBar'
import { ScaledCard } from '../components/card/CardStage'
import { formatClassSection } from '../data/academics'
import { listSubjects, resolveSubject } from '../data/subjects'
import { randomLifeSkill } from '../data/lifeSkills'
import { randomVocabulary } from '../data/vocabulary'
import { useCardEditor } from '../hooks/useCardEditor'
import { clearDraft, countFilledItems } from '../services/homeworkService'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import type { HomeworkCard } from '../types'
import { todayKey } from '../utils/date'

interface EditorPageProps {
  cardId: string
}

const STEPS = ['Basic Details', 'Homework', 'Generate']

export function EditorPage({ cardId }: EditorPageProps) {
  const location = useLocation()
  const routeState = location.state as {
    isNew?: boolean
    step?: number
    basics?: { classId: string; sectionId: string; date: string }
  } | null
  const isNew = Boolean(routeState?.isNew)

  const navigate = useNavigate()
  const { settings, ready } = useSettings()
  const { toast, warn } = useToast()
  const [conflictOpen, setConflictOpen] = useState(false)
  // The dashboard sheet collects step 1, so it sends the teacher straight to
  // step 2 rather than making them confirm what they just chose.
  const [step, setStep] = useState(() => Math.min(Math.max(routeState?.step ?? 0, 0), 2))
  const body = useRef<HTMLDivElement>(null)
  // Guards against a double tap or rapid navigation queueing two saves.
  const saving = useRef(false)

  const editor = useCardEditor(cardId, todayKey(), settings, ready)
  const { card, conflict } = editor

  // Step 1 was answered in the dashboard sheet; write those answers onto the
  // fresh card exactly once, as soon as it exists.
  const seeded = useRef(false)
  const basics = routeState?.basics
  useEffect(() => {
    if (seeded.current || !basics || editor.loading || !editor.card) return
    seeded.current = true
    editor.patch({ classId: basics.classId, sectionId: basics.sectionId })
    if (basics.date) editor.setDate(basics.date)
  }, [basics, editor.loading, editor.card, editor.patch, editor.setDate])

  // Each step starts at the top; without this, moving on lands mid-form.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
  }, [step])

  if (editor.loading || !card) {
    return (
      <div className="screen">
        <TopBar title="Homework" back />
        <div className="screen-body pt-10 text-center text-sm text-muted">Loading…</div>
      </div>
    )
  }

  /** Class, section and date — everything step 1 is responsible for. */
  function validateBasics(current: HomeworkCard): string | null {
    if (!current.classId) return 'Select a class first'
    if (!current.sectionId) return 'Select a section first'
    if (!current.date) return 'Choose a date'
    return null
  }

  /** The word of the day — everything step 2 is responsible for. */
  function validateDetails(current: HomeworkCard): string | null {
    if (!current.word.trim()) return 'Enter the word of the day'
    if (current.showMeaning && !current.meaning.trim()) {
      return 'Enter the meaning, or switch it off'
    }
    if (!current.synonym.trim()) return 'Enter a synonym'
    return null
  }

  /**
   * Everything the card must have before it can be saved or shared. Unchanged
   * from the single-form version — the steps only decide where a problem is
   * reported, never what counts as valid.
   */
  function validate(current: HomeworkCard): string | null {
    return validateBasics(current) ?? validateDetails(current)
  }

  function goNext() {
    if (!card) return
    const problem = step === 0 ? validateBasics(card) : validateDetails(card)
    if (problem) {
      warn(problem)
      return
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  async function handleSave(thenPreview: boolean) {
    if (saving.current || !card) return
    const problem = validate(card)
    if (problem) {
      warn(problem)
      // Send the teacher to the step that owns the problem.
      setStep(validateBasics(card) ? 0 : 1)
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

  /**
   * Options for one row. A card saved with a subject that has since been
   * removed in Settings keeps that subject in its own dropdown, so opening and
   * re-saving an old card never silently rewrites it.
   */
  function subjectOptionsFor(currentKey: string) {
    const offered = listSubjects(settings)
    if (offered.some((subject) => subject.id === currentKey)) return offered
    return [...offered, { id: currentKey, preset: resolveSubject(settings, currentKey) }]
  }

  async function openExisting(existing: HomeworkCard) {
    setConflictOpen(false)
    // The card being abandoned was never saved — drop its draft so it does not
    // linger on Home behind the card the teacher actually wanted.
    if (isNew) await clearDraft(cardId)
    navigate(`/edit/${existing.id}`, { replace: true, state: { step: 1 } })
  }

  const filled = countFilledItems(card)

  return (
    <div className="screen">
      <TopBar
        title={isNew ? 'New Homework' : 'Edit Homework'}
        subtitle={`${formatClassSection(settings, card)} · ${card.displayDate}`}
        back
        right={editor.dirty ? <span className="chip-accent">Draft</span> : null}
      />

      <div className="flex-shrink-0 border-b border-line bg-app px-4 py-3">
        <StepIndicator steps={STEPS} current={step} onGoTo={setStep} />
      </div>

      <div ref={body} className="screen-body space-y-4 pt-4">
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

        {/* Shown on every step: a clash makes the whole card unsavable, so it
            must not be hidden behind the step that caused it. */}
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

        {/* ------------------------- Step 1 — basics ------------------------ */}
        {step === 0 && (
          <section className="panel">
            <h2 className="panel-title mb-1">Class &amp; Date</h2>
            <p className="mb-3 text-xs text-muted">Who this card is for, and which day it covers.</p>

            <BasicDetailsFields
              settings={settings}
              classId={card.classId}
              sectionId={card.sectionId}
              date={card.date}
              onClassChange={(classId) => editor.patch({ classId })}
              onSectionChange={(sectionId) => editor.patch({ sectionId })}
              onDateChange={(key) => key && editor.setDate(key)}
              idPrefix="editor"
            />
          </section>
        )}

        {/* ------------------------ Step 2 — details ------------------------ */}
        {step === 1 && (
          <>
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
                        {subjectOptionsFor(item.subjectKey).map((subject) => (
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
          </>
        )}

        {/* ------------------ Step 3 — review and generate ------------------ */}
        {step === 2 && (
          <>
            <section className="panel">
              <h2 className="panel-title mb-3">Check before you send</h2>

              <dl className="space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Class</dt>
                  <dd className="text-right font-semibold text-ink">
                    {formatClassSection(settings, card)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Date</dt>
                  <dd className="text-right font-semibold text-ink">
                    {card.displayDate} · {card.day}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Subjects with work</dt>
                  <dd className="text-right font-semibold text-ink">
                    {filled} of {card.items.length}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Word of the day</dt>
                  <dd className="text-right font-semibold text-ink">{card.word || '—'}</dd>
                </div>
                {card.announcement.trim() && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">Announcement</dt>
                    <dd className="max-w-[60%] text-right font-semibold text-ink">
                      {card.announcement}
                    </dd>
                  </div>
                )}
              </dl>

              {filled === 0 && (
                <p className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs leading-relaxed text-accent">
                  No subject has any work written against it yet. You can still save, but the card
                  will go out with an empty homework list.
                </p>
              )}
            </section>

            {/* The card itself — the real review. */}
            <section className="panel">
              <h2 className="panel-title mb-3">Preview</h2>
              <ScaledCard card={card} settings={settings} />
            </section>
          </>
        )}
      </div>

      {/* ------------------------------ Actions ----------------------------- */}
      <div className="sticky-actions">
        {step === 0 && (
          <button type="button" onClick={goNext} className="btn-primary w-full text-base">
            Continue
          </button>
        )}

        {step === 1 && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1">
              Back
            </button>
            <button type="button" onClick={goNext} className="btn-primary flex-[1.6] text-base">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void handleSave(true)}
              className="btn-primary w-full text-base"
            >
              Save &amp; Share
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleSave(false)}
                className="btn-secondary flex-1"
              >
                Save only
              </button>
            </div>
          </div>
        )}
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
