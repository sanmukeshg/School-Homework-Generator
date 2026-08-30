import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/settingsService'
import { applyTheme } from '../services/themeService'
import type { SchoolSettings } from '../types'

interface SettingsApi {
  settings: SchoolSettings
  ready: boolean
  update: (patch: Partial<SchoolSettings>) => void
  reload: () => Promise<void>
}

const SettingsContext = createContext<SettingsApi | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  const reload = useCallback(async () => {
    const loaded = await loadSettings()
    setSettings(loaded)
    setReady(true)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Themes switch instantly — no reload, no network.
  useEffect(() => {
    if (ready) applyTheme(settings.theme)
  }, [ready, settings.theme])

  // Writes through to IndexedDB immediately — settings are small and rare.
  const update = useCallback((patch: Partial<SchoolSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      void saveSettings(next)
      return next
    })
  }, [])

  const api = useMemo<SettingsApi>(
    () => ({ settings, ready, update, reload }),
    [settings, ready, update, reload]
  )

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
