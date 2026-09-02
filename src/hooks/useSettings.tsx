import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { useAuth } from './useAuth'
import { DEFAULT_SETTINGS, isSchoolConfigured, loadSettings, saveSettings } from '../services/settingsService'
import { observeCloudSettings, saveCloudSettings } from '../services/cloudSettingsService'
import { applyTheme } from '../services/themeService'
import type { SchoolSettings } from '../types'

interface SettingsApi {
  settings: SchoolSettings
  ready: boolean
  update: (patch: Partial<SchoolSettings>) => void
  reload: () => Promise<void>
}

const SettingsContext = createContext<SettingsApi | null>(null)

/** Settings change rarely; this keeps typing from becoming a write per keystroke. */
const CLOUD_WRITE_DELAY_MS = 1200

/** Never hold the boot screen on the cloud for longer than this. */
const CLOUD_FIRST_READ_TIMEOUT_MS = 4000

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus } = useAuth()
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS)
  const [localLoaded, setLocalLoaded] = useState(false)
  const [cloudSettled, setCloudSettled] = useState(false)

  const latest = useRef(settings)
  latest.current = settings

  const cloudTimer = useRef<number | undefined>(undefined)
  const uidRef = useRef<string | null>(null)

  /** Reads the local copy. It is the fastest source and works signed out. */
  const reload = useCallback(async () => {
    const loaded = await loadSettings()
    setSettings(loaded)
    setLocalLoaded(true)
    // A restore or reset should reach the other devices too.
    if (uidRef.current) void saveCloudSettings(uidRef.current, loaded)
  }, [])

  useEffect(() => {
    void (async () => {
      const loaded = await loadSettings()
      setSettings(loaded)
      setLocalLoaded(true)
    })()
  }, [])

  // Themes switch instantly — no reload, no network.
  useEffect(() => {
    if (localLoaded) applyTheme(settings.theme)
  }, [localLoaded, settings.theme])

  /**
   * Cloud is the source of truth once signed in.
   *
   * A device that already holds settings and has never synced — the testing
   * data on this machine, for instance — seeds the empty cloud document rather
   * than being overwritten by defaults.
   */
  useEffect(() => {
    uidRef.current = null

    if (authStatus !== 'signed-in' || !user) {
      setCloudSettled(authStatus !== 'loading')
      return
    }

    uidRef.current = user.uid
    setCloudSettled(false)

    // Firestore answers from its cache when offline, but never let a slow
    // network hold the boot screen open.
    const timeout = window.setTimeout(() => setCloudSettled(true), CLOUD_FIRST_READ_TIMEOUT_MS)
    let seeded = false

    const unsubscribe = observeCloudSettings(user.uid, (cloud) => {
      if (cloud) {
        setSettings(cloud)
        // Mirror locally so the app still opens correctly when signed out or
        // offline before Firestore has warmed up.
        void saveSettings(cloud)
      } else if (!seeded && isSchoolConfigured(latest.current)) {
        seeded = true
        void saveCloudSettings(user.uid, latest.current)
      }
      window.clearTimeout(timeout)
      setCloudSettled(true)
    })

    return () => {
      window.clearTimeout(timeout)
      unsubscribe()
    }
  }, [authStatus, user])

  /**
   * Local write is immediate so the UI never waits; the cloud write is
   * debounced so holding down a key does not become a write per character.
   */
  const update = useCallback((patch: Partial<SchoolSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      latest.current = next
      void saveSettings(next)

      const uid = uidRef.current
      if (uid) {
        window.clearTimeout(cloudTimer.current)
        cloudTimer.current = window.setTimeout(() => {
          void saveCloudSettings(uid, latest.current)
        }, CLOUD_WRITE_DELAY_MS)
      }

      return next
    })
  }, [])

  useEffect(() => () => window.clearTimeout(cloudTimer.current), [])

  const api = useMemo<SettingsApi>(
    () => ({ settings, ready: localLoaded && cloudSettled, update, reload }),
    [settings, localLoaded, cloudSettled, update, reload]
  )

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
