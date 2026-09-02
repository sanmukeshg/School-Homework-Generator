import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { BootPage } from './pages/BootPage'
import { EditorPage } from './pages/EditorPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { PreviewPage } from './pages/PreviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { WelcomePage } from './pages/WelcomePage'
import { SettingsProvider, useSettings } from './hooks/useSettings'
import { ToastProvider } from './hooks/useToast'
import { initializeFirebase } from './firebase/app'
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
 * Start-up gate. Holds the Factory AI boot screen until Firebase has been
 * initialised and the local configuration has been read — no timers, no
 * artificial minimum duration.
 *
 * Firebase failing or being absent does not block start-up: the app is
 * offline-first and every screen works from IndexedDB, so a bad network on
 * first launch must not leave the teacher staring at a splash.
 */
function Boot({ children }: { children: ReactNode }) {
  const { ready: settingsReady } = useSettings()
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

  if (!settingsReady || !firebaseSettled) return <BootPage />
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
    <SettingsProvider>
      <ToastProvider>
        <HashRouter>
          <Boot>
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
            </RequireSchool>
          </Boot>
        </HashRouter>
      </ToastProvider>
    </SettingsProvider>
  )
}
