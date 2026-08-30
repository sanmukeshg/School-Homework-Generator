import { useState, type FormEvent } from 'react'
import { useSettings } from '../hooks/useSettings'

/**
 * Shown once, before the app is usable, so a fresh installation carries the
 * teacher's own school rather than sample data. Purely local: the answers go
 * straight into IndexedDB, there is no account and nothing leaves the phone.
 */
export function WelcomePage() {
  const { update } = useSettings()
  const [schoolName, setSchoolName] = useState('')
  const [initials, setInitials] = useState('')

  const ready = schoolName.trim().length > 0 && initials.trim().length > 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ready) return
    update({ schoolName: schoolName.trim(), initials: initials.trim().toUpperCase() })
  }

  return (
    <div className="screen">
      <form onSubmit={handleSubmit} className="screen-body app-safe-top flex flex-col pt-10">
        <div className="mx-auto w-full max-w-md">
          <p className="panel-title">Welcome</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Set up your school
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            These appear on every homework card you create. You can change them later in
            Settings.
          </p>

          <div className="panel mt-6 space-y-4">
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
                autoFocus
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

          <button type="submit" disabled={!ready} className="btn-primary mt-6 w-full text-base">
            Continue
          </button>

          {!ready && (
            <p className="mt-3 text-center text-[11px] text-faint">
              Both fields are needed to continue.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
