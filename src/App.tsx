import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppTour } from './components/AppTour'
import { AdminPage } from './pages/AdminPage'
import { BootPage } from './pages/BootPage'
import { EditorPage } from './pages/EditorPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PreviewPage } from './pages/PreviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { WelcomePage } from './pages/WelcomePage'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { EntitlementProvider } from './hooks/useEntitlement'
import { useIsMobile } from './hooks/useIsMobile'
import { RoleProvider, useRole } from './hooks/useRole'
import { useHomeworkSync } from './hooks/useHomeworkSync'
import { SettingsProvider, useSettings } from './hooks/useSettings'
import { ToastProvider } from './hooks/useToast'
import { initializeFirebase } from './firebase/app'
import { ensureAccountScope } from './services/accountScope'
import { isSchoolConfigured } from './services/settingsService'
import { uid } from './utils/id'

/**
 * "New" is a redirect, not a screen: it mints the card id up front so the
 * editor always works against a real URL. Without that, React would reuse one
 * editor instance across visits and the second new card would overwrite the
 * first.
 */
function NewCardRoute() {
  const id = useMemo(() => uid('card'), [])
  return <Navigate to={`/edit/${id}`} replace state={{ isNew: true }} />
}

/** Keying by card id gives every card a clean editor instance. */
function EditorRoute() {
  const { cardId = '' } = useParams<{ cardId: string }>()
  return <EditorPage key={cardId} cardId={cardId} />
}

function PreviewRoute() {
  const { cardId = '' } = useParams<{ cardId: string }>()
  return <PreviewPage key={cardId} cardId={cardId} />
}

/**
 * Isolates the device's local data to the account signing in.
 *
 * Sits above SettingsProvider deliberately. Everything below reads IndexedDB
 * the moment it mounts, so the reconciliation has to finish first — if it ran
 * alongside, the previous account's settings would already be in memory and
 * would be seeded into the new account's cloud document before the wipe landed.
 *
 * The subtree is keyed by uid, so changing account remounts it. That throws
 * away in-memory state as well as stored state; without it, SettingsProvider
 * would keep holding the previous teacher's settings after the database
 * beneath it had been cleared.
 */
function AccountScope({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()
  const uid = user?.uid ?? null
  const [scopedTo, setScopedTo] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    // Wait for a definite answer; 'loading' is not one.
    if (status === 'loading') return

    let cancelled = false
    setScopedTo(undefined)

    void ensureAccountScope(uid)
      .then((result) => {
        if (result.action === 'cleared') {
          console.info('[account] A different account owned this device; local data cleared.')
        }
      })
      .catch((error) => {
        // Never strand the teacher on a splash screen over this.
        console.error('[account] Could not reconcile the local cache', error)
      })
      .finally(() => {
        if (!cancelled) setScopedTo(uid)
      })

    return () => {
      cancelled = true
    }
  }, [status, uid])

  if (status === 'loading' || scopedTo === undefined) return <BootPage />

  return <Fragment key={scopedTo ?? 'signed-out'}>{children}</Fragment>
}

/**
 * Start-up gate. Holds the Factory AI boot screen until Firebase has been
 * initialised, the sign-in state is known and the local configuration has been
 * read — no timers, no artificial minimum duration.
 *
 * Firebase failing or being absent does not block start-up: the app is
 * offline-first and every screen works from IndexedDB, so a bad network on
 * first launch must not leave the teacher staring at a splash.
 */
function Boot({ children }: { children: ReactNode }) {
  const { ready: settingsReady } = useSettings()
  const { status: authStatus } = useAuth()
  const [firebaseSettled, setFirebaseSettled] = useState(false)

  useEffect(() => {
    let cancelled = false
    void initializeFirebase().then(() => {
      if (!cancelled) setFirebaseSettled(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!settingsReady || !firebaseSettled || authStatus === 'loading') return <BootPage />
  return <>{children}</>
}

/**
 * Google sign-in stands in front of the app.
 *
 * When a build carries no Firebase configuration the status is 'unavailable'
 * and the gate steps aside, rather than locking the teacher out of an app that
 * works perfectly well offline.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'signed-out') return <LoginPage />
  return <>{children}</>
}

/**
 * Sends an administrator to the Admin Panel instead of the teacher app.
 *
 * Three conditions, all of which must hold:
 *
 * - the account really is an administrator, which is a Firestore read the
 *   rules allow only for the account's own entry;
 * - the viewport is phone-sized, because the panel is a mobile-only surface
 *   and the desktop experience is meant to stay exactly as it was;
 * - they have not asked to preview the teacher app.
 *
 * This decides what is drawn. It is not the security boundary and cannot be:
 * every read and write the panel makes is checked again by the Security Rules,
 * so forcing this branch open in a debugger yields a panel full of refusals.
 * Equally, a wide window hides the panel without taking any right away.
 */
function RoleRouter({ children }: { children: ReactNode }) {
  const { isAdmin, ready, previewingApp } = useRole()
  const isMobile = useIsMobile()

  // Hold the splash rather than flashing the teacher app at an administrator.
  if (!ready) return <BootPage />
  if (isAdmin && isMobile && !previewingApp) return <AdminPage />
  return <>{children}</>
}

/**
 * Lets an administrator previewing the teacher app get back out, without
 * changing their role. Only rendered for someone who is actually previewing.
 */
function PreviewBanner() {
  const { isAdmin, previewingApp, setPreviewingApp } = useRole()
  const showing = isAdmin && previewingApp

  // The bar is fixed, so the app is given exactly its height back at the root;
  // without that it would sit on top of the school name.
  useEffect(() => {
    document.body.classList.toggle('is-previewing', showing)
    return () => document.body.classList.remove('is-previewing')
  }, [showing])

  if (!showing) return null

  return (
    <button type="button" onClick={() => setPreviewingApp(false)} className="preview-bar">
      Previewing as teacher · Back to Admin
    </button>
  )
}

/** Keeps the local homework cache in step with the account. */
function HomeworkSync({ children }: { children: ReactNode }) {
  useHomeworkSync()
  return <>{children}</>
}

/**
 * A fresh installation has no school yet, so the first-use screen stands in
 * front of the whole app until the name and initials are saved locally.
 */
function RequireSchool({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  if (!isSchoolConfigured(settings)) return <WelcomePage />
  return <>{children}</>
}

/**
 * Hash routing keeps deep links working on any static host (Firebase Hosting,
 * GitHub Pages, a plain folder) with no server rewrite rules.
 */
export default function App() {
  return (
    <AuthProvider>
      <AccountScope>
        <SettingsProvider>
        <ToastProvider>
          <HashRouter>
            <Boot>
              <RequireAuth>
                <RoleProvider>
                  <RoleRouter>
                    <PreviewBanner />
                    <EntitlementProvider>
                      <HomeworkSync>
                        <RequireSchool>
                          <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/new" element={<NewCardRoute />} />
                            <Route path="/edit/:cardId" element={<EditorRoute />} />
                            <Route path="/preview/:cardId" element={<PreviewRoute />} />
                            <Route path="/history" element={<HistoryPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                          {/* Rides above the routes so it can point at any screen. */}
                          <AppTour />
                        </RequireSchool>
                      </HomeworkSync>
                    </EntitlementProvider>
                  </RoleRouter>
                </RoleProvider>
              </RequireAuth>
            </Boot>
          </HashRouter>
        </ToastProvider>
        </SettingsProvider>
      </AccountScope>
    </AuthProvider>
  )
}
