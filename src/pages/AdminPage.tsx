import { useCallback, useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { TopBar } from '../components/TopBar'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
import { useToast } from '../hooks/useToast'
import {
  grantAdmin,
  listUsers,
  revokeAdmin,
  type ManagedUser
} from '../services/adminService'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  listAllFeedback,
  MAX_FEEDBACK_LENGTH,
  updateFeedback,
  type FeedbackItem,
  type FeedbackStatus
} from '../services/feedbackService'
import { formatDisplayDate } from '../utils/date'

type Tab = 'users' | 'feedback'

/** Statuses that still want somebody's attention. */
const OPEN_STATUSES: FeedbackStatus[] = ['new', 'under-review']

function shortDate(value: Date | null): string {
  return value ? formatDisplayDate(value) : '—'
}

function statusLabel(status: FeedbackStatus): string {
  return FEEDBACK_STATUSES.find((entry) => entry.id === status)?.label ?? status
}

function categoryLabel(id: string): string {
  return FEEDBACK_CATEGORIES.find((entry) => entry.id === id)?.label ?? id
}

/**
 * The Admin Panel.
 *
 * A separate experience, not a tab inside the teacher app: an administrator
 * lands here and never passes through school setup, homework sync or the
 * dashboard. Looking at the teacher app is a deliberate, temporary act — the
 * Preview button — and it does not change the role.
 *
 * Everything drawn here is already permitted or refused by the Security Rules.
 * The panel is the convenient way to do the work, never the thing that grants
 * the right to do it.
 */
export function AdminPage() {
  const { user, signOut } = useAuth()
  const { setPreviewingApp } = useRole()
  const { toast, warn } = useToast()

  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [problem, setProblem] = useState<string | null>(null)

  const [openUser, setOpenUser] = useState<ManagedUser | null>(null)
  const [openItem, setOpenItem] = useState<FeedbackItem | null>(null)
  const [draftStatus, setDraftStatus] = useState<FeedbackStatus>('new')
  const [draftNote, setDraftNote] = useState('')
  const [askRevoke, setAskRevoke] = useState<ManagedUser | null>(null)
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all' | 'open'>('open')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setProblem(null)
    try {
      const [nextUsers, nextFeedback] = await Promise.all([listUsers(), listAllFeedback()])
      setUsers(nextUsers)
      setFeedback(nextFeedback)
    } catch (error) {
      // The rules refusing here is the system working, not a bug: say so
      // plainly rather than showing an empty panel that looks broken.
      setProblem(
        error instanceof Error && error.message.includes('permission')
          ? 'This account is not allowed to read the admin data.'
          : 'Could not load. Check the connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visibleFeedback = useMemo(() => {
    if (statusFilter === 'all') return feedback
    if (statusFilter === 'open') {
      return feedback.filter((item) => OPEN_STATUSES.includes(item.status))
    }
    return feedback.filter((item) => item.status === statusFilter)
  }, [feedback, statusFilter])

  const openCount = feedback.filter((item) => OPEN_STATUSES.includes(item.status)).length

  function openFeedback(item: FeedbackItem) {
    setOpenItem(item)
    setDraftStatus(item.status)
    setDraftNote(item.adminNote)
  }

  async function saveFeedback() {
    if (!openItem || busy) return
    setBusy(true)
    try {
      await updateFeedback(openItem.id, { status: draftStatus, adminNote: draftNote })
      toast('Feedback updated')
      setOpenItem(null)
      await load()
    } catch {
      warn('That change was refused')
    } finally {
      setBusy(false)
    }
  }

  async function toggleAdmin(target: ManagedUser, grant: boolean) {
    if (!user || busy) return
    setBusy(true)
    try {
      if (grant) await grantAdmin(target.uid, user.uid)
      else await revokeAdmin(target.uid)
      toast(grant ? 'Admin access granted' : 'Admin access removed')
      setOpenUser(null)
      setAskRevoke(null)
      await load()
    } catch {
      warn('That change was refused')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <TopBar
        title="Admin Panel"
        subtitle={user?.email ?? undefined}
        right={
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh"
            className="icon-btn text-sm font-semibold"
          >
            ↻
          </button>
        }
      />

      {/* Two jobs, one control. Sized for a thumb. */}
      <div className="flex-shrink-0 px-4 pt-3">
        <div
          role="tablist"
          aria-label="Admin sections"
          className="flex gap-1 rounded-full border border-line bg-surface-2 p-1"
        >
          {(
            [
              { id: 'users' as Tab, label: `Users${users.length ? ` · ${users.length}` : ''}` },
              { id: 'feedback' as Tab, label: `Feedback${openCount ? ` · ${openCount}` : ''}` }
            ]
          ).map((entry) => {
            const active = tab === entry.id
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(entry.id)}
                className={[
                  'flex min-h-[44px] flex-1 items-center justify-center rounded-full text-sm font-semibold transition active:scale-95',
                  active ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted'
                ].join(' ')}
              >
                {entry.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="screen-body pt-4">
        {problem && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-danger/50 p-3 text-xs leading-relaxed text-danger"
          >
            {problem}
          </div>
        )}

        {loading ? (
          <p className="pt-8 text-center text-sm text-muted">Loading…</p>
        ) : tab === 'users' ? (
          <UserList users={users} onOpen={setOpenUser} />
        ) : (
          <>
            {/* Status filter — the pipeline, as chips. */}
            <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
              {(
                [
                  { id: 'open' as const, label: 'Needs attention' },
                  { id: 'all' as const, label: 'All' },
                  ...FEEDBACK_STATUSES.map((entry) => ({ id: entry.id, label: entry.label }))
                ]
              ).map((entry) => {
                const active = statusFilter === entry.id
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setStatusFilter(entry.id)}
                    className={[
                      'min-h-[38px] flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition active:scale-95',
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line bg-surface-2 text-muted'
                    ].join(' ')}
                  >
                    {entry.label}
                  </button>
                )
              })}
            </div>

            <FeedbackList items={visibleFeedback} onOpen={openFeedback} />
          </>
        )}

        <div className="mt-8 space-y-2 border-t border-line pt-5">
          <p className="text-center text-[11px] leading-relaxed text-faint">
            Preview opens the teacher app for this account. Your admin role is unchanged and you
            can come straight back.
          </p>
          <button
            type="button"
            onClick={() => setPreviewingApp(true)}
            className="btn-secondary w-full text-sm"
          >
            Preview teacher app
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="btn-ghost w-full text-sm"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ------------------------------ One user ---------------------------- */}
      <BottomSheet
        open={openUser !== null}
        title={openUser?.displayName || 'Account'}
        subtitle={openUser?.email ?? undefined}
        onClose={() => setOpenUser(null)}
        size="tall"
        footer={
          openUser && (
            <div className="space-y-2">
              {openUser.uid === user?.uid ? (
                <p className="pb-1 text-center text-[11px] leading-relaxed text-faint">
                  This is your own account. You cannot remove your own admin access.
                </p>
              ) : openUser.isAdmin ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setAskRevoke(openUser)}
                  className="btn-danger w-full"
                >
                  Remove admin access
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleAdmin(openUser, true)}
                  className="btn-primary w-full"
                >
                  Make administrator
                </button>
              )}
              <button type="button" onClick={() => setOpenUser(null)} className="btn-ghost w-full">
                Close
              </button>
            </div>
          )
        }
      >
        {openUser && (
          <dl className="space-y-2 pb-2 text-sm">
            <Row label="Role" value={openUser.isAdmin ? 'Administrator' : 'Teacher'} />
            <Row label="Plan" value={openUser.plan ? `${openUser.plan} · ${openUser.status}` : '—'} />
            <Row label="Free access ends" value={shortDate(openUser.trialEndsAt)} />
            <Row label="Registered" value={shortDate(openUser.createdAt)} />
            <Row label="Last seen" value={shortDate(openUser.lastLoginAt)} />
            <Row label="Account id" value={openUser.uid} mono />
          </dl>
        )}
      </BottomSheet>

      {/* ---------------------------- One feedback -------------------------- */}
      <BottomSheet
        open={openItem !== null}
        title={openItem ? categoryLabel(openItem.category) : 'Feedback'}
        subtitle={
          openItem
            ? `${openItem.displayName || openItem.email || 'Unknown'} · ${shortDate(openItem.createdAt)}`
            : undefined
        }
        onClose={() => setOpenItem(null)}
        size="tall"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpenItem(null)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveFeedback()}
              className="btn-primary flex-[1.6]"
            >
              Save
            </button>
          </div>
        }
      >
        {openItem && (
          <div className="space-y-4 pb-2">
            <p className="whitespace-pre-wrap rounded-2xl border border-line bg-surface-2 p-3 text-sm leading-relaxed text-ink">
              {openItem.message}
            </p>

            <div>
              <p className="field-label">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_STATUSES.map((entry) => {
                  const active = draftStatus === entry.id
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDraftStatus(entry.id)}
                      className={['choice-card', active ? 'choice-card-on' : ''].join(' ')}
                    >
                      {entry.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="admin-note">
                Internal note
              </label>
              <textarea
                id="admin-note"
                rows={3}
                maxLength={MAX_FEEDBACK_LENGTH}
                className="field resize-none"
                placeholder="Only administrators see this."
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
              />
            </div>

            <p className="text-[11px] leading-relaxed text-faint">
              The message, who sent it and when cannot be edited — the rules refuse it, so the
              record of what a teacher actually said always stands.
            </p>
          </div>
        )}
      </BottomSheet>

      <ConfirmSheet
        open={askRevoke !== null}
        title="Remove admin access?"
        message={
          askRevoke
            ? `${askRevoke.displayName || askRevoke.email} will lose the Admin Panel and go back to the teacher app. You can grant it again at any time.`
            : ''
        }
        confirmLabel="Remove access"
        onConfirm={() => askRevoke && void toggleAdmin(askRevoke, false)}
        onCancel={() => setAskRevoke(null)}
      />
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex-shrink-0 text-muted">{label}</dt>
      <dd
        className={[
          'min-w-0 break-all text-right font-semibold text-ink',
          mono ? 'text-[11px]' : ''
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}

function UserList({
  users,
  onOpen
}: {
  users: ManagedUser[]
  onOpen: (user: ManagedUser) => void
}) {
  if (users.length === 0) {
    return <p className="panel text-center text-sm text-muted">No accounts yet.</p>
  }

  return (
    <ul className="space-y-2">
      {users.map((entry) => (
        <li key={entry.uid}>
          <button
            type="button"
            onClick={() => onOpen(entry)}
            className="setting-card w-full text-left"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2">
              {entry.photoURL ? (
                <img src={entry.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-muted">
                  {(entry.displayName || entry.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">
                {entry.displayName || entry.email || entry.uid}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                {entry.email ?? 'No email'}
              </span>
            </span>

            {entry.isAdmin && <span className="chip-brand flex-shrink-0">Admin</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

function FeedbackList({
  items,
  onOpen
}: {
  items: FeedbackItem[]
  onOpen: (item: FeedbackItem) => void
}) {
  if (items.length === 0) {
    return <p className="panel text-center text-sm text-muted">Nothing here.</p>
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="panel block w-full text-left active:scale-[0.98]"
          >
            <span className="mb-1.5 flex items-center gap-2">
              <span
                className={[
                  'chip',
                  item.status === 'new'
                    ? 'chip-accent'
                    : item.status === 'implemented'
                      ? 'chip-brand'
                      : 'border-line bg-surface-2 text-muted'
                ].join(' ')}
              >
                {statusLabel(item.status)}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                {categoryLabel(item.category)}
              </span>
              <span className="ml-auto flex-shrink-0 text-[11px] text-faint">
                {shortDate(item.createdAt)}
              </span>
            </span>

            <span className="line-clamp-2 block text-sm leading-relaxed text-ink">
              {item.message}
            </span>

            <span className="mt-1.5 block truncate text-xs text-muted">
              {item.displayName || item.email || item.uid}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
