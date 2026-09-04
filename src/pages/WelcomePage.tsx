import { useState } from 'react'
import { BrandMark } from '../components/BrandMark'
import { ChoiceGrid } from '../components/ChoiceGrid'
import { StepIndicator } from '../components/StepIndicator'
import { DEFAULT_CLASSES, DEFAULT_SECTIONS } from '../data/academics'
import { SUBJECT_KEYS, SUBJECT_PRESETS } from '../data/subjects'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { markTourPending } from '../services/tourService'

const STEPS = ['School', 'Classes', 'Sections', 'Subjects']

const CLASS_CHOICES = DEFAULT_CLASSES.map(({ id, label }) => ({ id, label }))
const SECTION_CHOICES = DEFAULT_SECTIONS.map(({ id, label }) => ({ id, label }))
const SUBJECT_CHOICES = SUBJECT_KEYS.map((id) => ({ id, label: SUBJECT_PRESETS[id].name }))

/**
 * First-use setup.
 *
 * A teacher does not teach every class in the school, so nothing here is
 * pre-ticked: they pick the classes, sections and subjects they actually teach,
 * and those picks become their Settings. Guessing on their behalf is what made
 * the old single-question setup hand everyone Nursery through Class 10.
 *
 * Purely local — the answers go into IndexedDB, and sync to the account like
 * any other settings change.
 */
export function WelcomePage() {
  const { update } = useSettings()
  const { warn } = useToast()

  const [step, setStep] = useState(0)
  const [schoolName, setSchoolName] = useState('')
  const [initials, setInitials] = useState('')
  const [classes, setClasses] = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [subjects, setSubjects] = useState<string[]>([])

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id]

  /** What step `index` still needs before it can be left. */
  function problemWith(index: number): string | null {
    if (index === 0) {
      if (!schoolName.trim()) return 'Enter the school name'
      if (!initials.trim()) return 'Enter the initials'
      return null
    }
    if (index === 1 && classes.length === 0) return 'Pick at least one class'
    if (index === 2 && sections.length === 0) return 'Pick at least one section'
    if (index === 3 && subjects.length === 0) return 'Pick at least one subject'
    return null
  }

  function goNext() {
    const problem = problemWith(step)
    if (problem) {
      warn(problem)
      return
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }
    void finish()
  }

  /**
   * Writes the picks into Settings.
   *
   * Classes and sections become the lists offered when creating a card.
   * Subjects do double duty: the ones picked are loaded onto a new card, and
   * every built-in left unpicked is marked removed so the teacher is never
   * offered a subject they do not teach. Both are editable in Settings.
   */
  async function finish() {
    const chosen = new Set(subjects)
    update({
      schoolName: schoolName.trim(),
      initials: initials.trim().toUpperCase(),
      classes: CLASS_CHOICES.filter((item) => classes.includes(item.id)),
      sections: SECTION_CHOICES.filter((item) => sections.includes(item.id)),
      defaultSubjects: subjects,
      removedSubjects: SUBJECT_KEYS.filter((key) => !chosen.has(key))
    })
    // The walkthrough starts as soon as the dashboard appears.
    markTourPending()
  }

  const lastStep = step === STEPS.length - 1

  return (
    <div className="screen">
      <div className="app-safe-top flex-shrink-0 px-4 pb-3 pt-6">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-3">
            <BrandMark size={44} />
            <div className="min-w-0">
              <p className="panel-title">Set up</p>
              <h1 className="text-[17px] font-semibold leading-tight tracking-tight text-ink">
                Homework Generator
              </h1>
            </div>
          </div>

          <div className="mt-5">
            <StepIndicator steps={STEPS} current={step} onGoTo={setStep} />
          </div>
        </div>
      </div>

      <div className="screen-body pt-4">
        <div className="mx-auto w-full max-w-md">
          {step === 0 && (
            <section className="panel">
              <h2 className="text-base font-semibold text-ink">Your school</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                These appear on every homework card you create.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="field-label" htmlFor="setup-school">
                    School name
                  </label>
                  <input
                    id="setup-school"
                    type="text"
                    className="field"
                    placeholder="Enter school name"
                    autoComplete="organization"
                    value={schoolName}
                    onChange={(event) => setSchoolName(event.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="setup-initials">
                    Initials
                  </label>
                  <input
                    id="setup-initials"
                    type="text"
                    maxLength={5}
                    className="field font-semibold uppercase placeholder:normal-case"
                    placeholder="e.g. VHS"
                    value={initials}
                    onChange={(event) => setInitials(event.target.value.toUpperCase())}
                  />
                  <p className="mt-1.5 text-[11px] text-faint">
                    Shown on the homework card until you add a logo.
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="panel">
              <h2 className="text-base font-semibold text-ink">Which classes do you teach?</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Pick only your own classes. These are what you will choose from when creating
                homework.
              </p>

              <div className="mt-4">
                <ChoiceGrid
                  label="Classes you teach"
                  choices={CLASS_CHOICES}
                  selected={classes}
                  onToggle={(id) => setClasses((current) => toggle(current, id))}
                />
              </div>

              <p className="mt-3 text-[11px] text-faint">
                {classes.length} selected · you can add more later in Settings
              </p>
            </section>
          )}

          {step === 2 && (
            <section className="panel">
              <h2 className="text-base font-semibold text-ink">Which sections do you handle?</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Each homework card is for one class and one section.
              </p>

              <div className="mt-4">
                <ChoiceGrid
                  label="Sections you handle"
                  choices={SECTION_CHOICES}
                  selected={sections}
                  onToggle={(id) => setSections((current) => toggle(current, id))}
                />
              </div>

              <p className="mt-3 text-[11px] text-faint">
                {sections.length} selected · you can add more later in Settings
              </p>
            </section>
          )}

          {step === 3 && (
            <section className="panel">
              <h2 className="text-base font-semibold text-ink">Which subjects do you teach?</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                These are loaded automatically when you start a new card, so your usual day is
                already laid out.
              </p>

              <div className="mt-4">
                <ChoiceGrid
                  label="Subjects you teach"
                  choices={SUBJECT_CHOICES}
                  columns={2}
                  selected={subjects}
                  onToggle={(id) => setSubjects((current) => toggle(current, id))}
                />
              </div>

              <p className="mt-3 text-[11px] text-faint">
                {subjects.length} selected · you can add your own subjects later in Settings
              </p>
            </section>
          )}

          {/* Said on every step, so nothing here feels permanent. */}
          <p className="mt-4 rounded-2xl border border-line bg-surface-2 p-3 text-[11px] leading-relaxed text-muted">
            Nothing here is locked in. Everything you choose can be changed at any time from{' '}
            <span className="font-semibold text-ink">Settings</span>.
          </p>
        </div>
      </div>

      <div className="sticky-actions">
        <div className="mx-auto flex w-full max-w-md gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="btn-secondary flex-1"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className={['btn-primary text-base', step > 0 ? 'flex-[1.6]' : 'w-full'].join(' ')}
          >
            {lastStep ? 'Save Changes' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
