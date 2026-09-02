import { useRef, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { TopBar } from '../components/TopBar'
import { toOptionId } from '../data/academics'
import {
  isBuiltInSubject,
  listSubjects,
  nextCustomColor,
  SUBJECT_PRESETS
} from '../data/subjects'
import { useAuth } from '../hooks/useAuth'
import { useEntitlement } from '../hooks/useEntitlement'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { deleteAllHomework, exportBackup, restoreBackup } from '../services/backupService'
import { THEMES } from '../services/themeService'
import type { ClassOption, SectionOption } from '../types'
import { formatDisplayDate } from '../utils/date'
import { resizeImageToDataUrl } from '../utils/file'

export function SettingsPage() {
  const { settings, update, reload } = useSettings()
  const { user, status: authStatus, signOut } = useAuth()
  const { entitlement } = useEntitlement()
  const { toast, warn } = useToast()
  const logoInput = useRef<HTMLInputElement>(null)
  const restoreInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [newClass, setNewClass] = useState('')
  const [newSection, setNewSection] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [askDeleteAll, setAskDeleteAll] = useState(false)

  async function handleLogo(file: File | undefined) {
    if (!file) return
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256)
      update({ logoDataUrl: dataUrl })
      toast('Logo updated')
    } catch {
      warn('That image could not be read')
    }
  }

  function toggleSubject(key: string) {
    const current = settings.defaultSubjects
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    update({ defaultSubjects: next })
  }

  function addOption(kind: 'classes' | 'sections', label: string) {
    const trimmed = label.trim()
    if (!trimmed) return
    const id = toOptionId(trimmed)
    const list = settings[kind] as (ClassOption | SectionOption)[]
    if (!id || list.some((item) => item.id === id)) {
      warn(`${trimmed} is already in the list`)
      return
    }
    const next = [...list, { id, label: trimmed }]
    if (kind === 'classes') {
      update({ classes: next })
      setNewClass('')
    } else {
      update({ sections: next })
      setNewSection('')
    }
  }

  function removeOption(kind: 'classes' | 'sections', id: string) {
    const list = settings[kind] as (ClassOption | SectionOption)[]
    const next = list.filter((item) => item.id !== id)
    if (kind === 'classes') update({ classes: next })
    else update({ sections: next })
  }


  /**
   * Adds a subject to the offered list. Typing the name of a built-in that was
   * removed earlier brings that one back rather than creating a duplicate.
   */
  function addSubject() {
    const label = newSubject.trim()
    if (!label) return
    const id = toOptionId(label)
    if (!id) return

    if (settings.removedSubjects.includes(id)) {
      update({ removedSubjects: settings.removedSubjects.filter((key) => key !== id) })
      setNewSubject('')
      toast(`${SUBJECT_PRESETS[id]?.name ?? label} is available again`)
      return
    }

    const taken = listSubjects(settings).some(
      (subject) => subject.id === id || subject.preset.name.toLowerCase() === label.toLowerCase()
    )
    if (taken) {
      warn(`${label} is already in the list`)
      return
    }

    update({
      customSubjects: [
        ...settings.customSubjects,
        { id, label, color: nextCustomColor(settings.customSubjects) }
      ]
    })
    setNewSubject('')
  }

  /**
   * Takes a subject out of the offered list. Homework already saved with it is
   * left completely alone — only what a new card can choose from changes.
   */
  function removeSubject(id: string) {
    update({
      customSubjects: settings.customSubjects.filter((item) => item.id !== id),
      removedSubjects: isBuiltInSubject(id)
        ? [...new Set([...settings.removedSubjects, id])]
        : settings.removedSubjects,
      defaultSubjects: settings.defaultSubjects.filter((key) => key !== id)
    })
  }

  async function handleExport() {
    setBusy(true)
    try {
      const filename = await exportBackup()
      toast(`Backup saved as ${filename}`)
    } catch {
      warn('Backup failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleRestore(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const result = await restoreBackup(file)
      await reload()
      toast(`Restored ${result.cards} ${result.cards === 1 ? 'card' : 'cards'}`)
    } catch (error) {
      warn(error instanceof Error ? error.message : 'Restore failed')
    } finally {
      setBusy(false)
      if (restoreInput.current) restoreInput.current.value = ''
    }
  }

  /** Clears homework only — the school configuration is preserved. */
  async function handleDeleteAllHomework() {
    setAskDeleteAll(false)
    setBusy(true)
    try {
      await deleteAllHomework()
      toast('All homework deleted')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <TopBar title="Settings" />

      <div className="screen-body space-y-4 pt-4">
        {/* Account */}
        {authStatus === 'signed-in' && user && (
          <section className="panel">
            <h2 className="panel-title mb-3">Account</h2>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-muted">
                    {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {user.displayName && (
                  <p className="truncate text-sm font-semibold text-ink">{user.displayName}</p>
                )}
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>

            {/* Entitlement, read from the account record in Firestore. */}
            <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
              {entitlement.state === 'trial' && (
                <>
                  <p className="text-sm font-semibold text-ink">Free access</p>
                  {entitlement.endsAt ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Your complimentary 6-month access ends on{' '}
                      <span className="font-semibold text-ink">
                        {formatDisplayDate(entitlement.endsAt)}
                      </span>
                      {entitlement.daysRemaining !== null &&
                        ` · ${entitlement.daysRemaining} days left`}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted">Setting up your free access…</p>
                  )}
                </>
              )}

              {entitlement.state === 'active' && (
                <p className="text-sm font-semibold text-ink">Subscription active</p>
              )}

              {entitlement.state === 'expired' && (
                <>
                  <p className="text-sm font-semibold text-ink">Your free access has ended.</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Subscription plans will be available soon. Nothing you have saved has been
                    removed.
                  </p>
                </>
              )}

              {entitlement.state === 'unknown' && (
                <p className="text-xs text-muted">
                  Account details will appear once you are back online.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              className="btn-secondary mt-3 w-full text-sm"
            >
              Sign out
            </button>
          </section>
        )}

        {/* Appearance — one compact Light / Dark toggle */}
        <section className="panel">
          <h2 className="panel-title mb-3">Appearance</h2>

          <div
            role="radiogroup"
            aria-label="Theme"
            className="flex gap-1 rounded-full border border-line bg-surface-2 p-1"
          >
            {THEMES.map((theme) => {
              const active = settings.theme === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ theme: theme.id })}
                  className={[
                    'flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition active:scale-95',
                    active ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted'
                  ].join(' ')}
                >
                  {/* A tick, not colour alone, marks the selection. */}
                  {active && <span aria-hidden="true">✓</span>}
                  {theme.label}
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            Applies to the app only — the generated homework image always keeps its own colourful
            design.
          </p>
        </section>

        {/* School */}
        <section className="panel">
          <h2 className="panel-title mb-3">School</h2>

          <div className="space-y-3">
            <div>
              <label className="field-label" htmlFor="school-name">
                School name
              </label>
              <input
                id="school-name"
                type="text"
                className="field"
                value={settings.schoolName}
                onChange={(event) => update({ schoolName: event.target.value })}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="school-initials">
                Initials
              </label>
              <input
                id="school-initials"
                type="text"
                maxLength={5}
                className="field font-semibold uppercase"
                value={settings.initials}
                onChange={(event) => update({ initials: event.target.value.toUpperCase() })}
              />
              <p className="mt-1.5 text-[11px] text-faint">
                Used on the homework image when no logo is set.
              </p>
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="panel">
          <h2 className="panel-title mb-3">Logo</h2>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2">
              {settings.logoDataUrl ? (
                <img
                  src={settings.logoDataUrl}
                  alt="School logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-muted">
                  {settings.initials || 'SCH'}
                </span>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                className="btn-secondary w-full text-sm"
              >
                Choose image
              </button>
              {settings.logoDataUrl && (
                <button
                  type="button"
                  onClick={() => update({ logoDataUrl: null })}
                  className="btn-ghost w-full text-sm"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>

          <input
            ref={logoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void handleLogo(event.target.files?.[0])}
          />

          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            The logo is resized and stored on this phone only. It is never uploaded anywhere.
          </p>
        </section>

        {/* Academic setup */}
        <section className="panel">
          <h2 className="panel-title mb-1">Academic Setup</h2>
          <p className="mb-3 text-xs text-muted">
            The classes and sections offered when creating homework.
          </p>

          <OptionEditor
            label="Classes"
            options={settings.classes}
            value={newClass}
            placeholder="e.g. Class 11"
            onValueChange={setNewClass}
            onAdd={() => addOption('classes', newClass)}
            onRemove={(id) => removeOption('classes', id)}
          />

          <div className="mt-4">
            <OptionEditor
              label="Sections"
              options={settings.sections}
              value={newSection}
              placeholder="e.g. E"
              onValueChange={setNewSection}
              onAdd={() => addOption('sections', newSection)}
              onRemove={(id) => removeOption('sections', id)}
            />
          </div>
        </section>

        {/* Subjects */}
        <section className="panel">
          <h2 className="panel-title mb-1">Subject Settings</h2>
          <p className="mb-3 text-xs text-muted">
            Tap a subject to load it automatically when you start a new card.
          </p>

          <div className="flex flex-wrap gap-2">
            {/* Every subject removes the same way — built-in or added here. */}
            {listSubjects(settings).map(({ id, preset }) => {
              const active = settings.defaultSubjects.includes(id)
              return (
                <span key={id} className="inline-flex items-center">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleSubject(id)}
                    className={[
                      'min-h-[44px] rounded-l-xl border border-r-0 px-3 text-xs font-semibold transition active:scale-95',
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line bg-surface-2 text-muted'
                    ].join(' ')}
                  >
                    {active ? '✓ ' : ''}
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${preset.name}`}
                    title={`Remove ${preset.name}`}
                    onClick={() => removeSubject(id)}
                    className="flex min-h-[44px] items-center rounded-r-xl border border-line bg-surface-2 px-3 text-lg font-semibold text-danger active:scale-95"
                  >
                    −
                  </button>
                </span>
              )
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              className="field flex-1"
              placeholder="e.g. Sanskrit"
              aria-label="Add subject"
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addSubject()
                }
              }}
            />
            <button type="button" onClick={addSubject} className="btn-secondary px-4">
              + Add Subject
            </button>
          </div>
        </section>

        {/* Backup */}
        <section className="panel">
          <h2 className="panel-title mb-1">Backup &amp; Restore</h2>
          <p className="mb-3 text-xs leading-relaxed text-muted">
            All data lives in this browser only. Clearing browser data or changing phone will lose
            it, so export a backup file now and then.
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={busy}
              className="btn-secondary w-full"
            >
              Export backup (.json)
            </button>
            <button
              type="button"
              onClick={() => restoreInput.current?.click()}
              disabled={busy}
              className="btn-secondary w-full"
            >
              Restore from backup
            </button>
            <input
              ref={restoreInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleRestore(event.target.files?.[0])}
            />
          </div>
        </section>

        {/* Danger zone */}
        <section className="panel border-danger/40">
          <h2 className="panel-title mb-1 text-danger">Reset</h2>
          <p className="mb-3 text-xs leading-relaxed text-muted">
            Removes saved homework and drafts. Your school settings, logo, academic setup and
            preferences stay as they are.
          </p>
          <button
            type="button"
            onClick={() => setAskDeleteAll(true)}
            disabled={busy}
            className="btn-danger w-full"
          >
            Delete All Homework
          </button>
        </section>

        <p className="pb-2 text-center text-[11px] text-faint">
          Works offline · no account, no server
        </p>
      </div>

      <ConfirmSheet
        open={askDeleteAll}
        title="Delete All Homework?"
        message="This will permanently delete all saved homework cards and their drafts. Your school settings, logo, academic setup and preferences will remain."
        confirmLabel="Delete Homework"
        onConfirm={() => void handleDeleteAllHomework()}
        onCancel={() => setAskDeleteAll(false)}
      />

      <BottomNav />
    </div>
  )
}

interface OptionEditorProps {
  label: string
  options: (ClassOption | SectionOption)[]
  value: string
  placeholder: string
  onValueChange: (value: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

/** Shared add/remove list for classes and sections. */
function OptionEditor({
  label,
  options,
  value,
  placeholder,
  onValueChange,
  onAdd,
  onRemove
}: OptionEditorProps) {
  return (
    <div>
      <p className="field-label">{label}</p>

      <ul className="flex flex-wrap gap-2">
        {options.map((option) => (
          <li
            key={option.id}
            className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 py-1 pl-3 pr-1 text-xs font-semibold text-ink"
          >
            {option.label}
            <button
              type="button"
              aria-label={`Remove ${option.label}`}
              onClick={() => onRemove(option.id)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-semibold text-danger active:scale-90"
            >
              −
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          className="field flex-1"
          placeholder={placeholder}
          value={value}
          aria-label={`Add ${label.toLowerCase().replace(/e?s$/, '')}`}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onAdd()
            }
          }}
        />
        <button type="button" onClick={onAdd} className="btn-secondary px-4">
          Add
        </button>
      </div>
    </div>
  )
}
