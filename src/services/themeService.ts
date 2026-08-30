import type { ThemeName } from '../types'

export const THEMES: { id: ThemeName; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
]

/** A fresh installation starts in Light. */
export const DEFAULT_THEME: ThemeName = 'light'

/** Colours that match each theme's app background, for the browser chrome. */
const THEME_COLOR: Record<ThemeName, string> = {
  light: '#f4f6f9',
  dark: '#0f172a'
}

/**
 * Accepts anything previously stored — including the retired 'night' and
 * 'system' values — and returns one of the two themes that exist now.
 */
export function normaliseTheme(value: unknown): ThemeName {
  if (value === 'light' || value === 'dark') return value
  if (value === 'night') return 'dark'
  if (value === 'system') return prefersDark() ? 'dark' : 'light'
  return DEFAULT_THEME
}

/**
 * IndexedDB is the source of truth, but it is async — this mirror lets the very
 * first paint use the right theme instead of flashing the default.
 */
const CACHE_KEY = 'almanac-theme'

export function readCachedTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (stored) return normaliseTheme(stored)
  } catch {
    /* private mode — fall through to the default */
  }
  return DEFAULT_THEME
}

function cacheTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(CACHE_KEY, theme)
  } catch {
    /* nothing we can do, IndexedDB still holds it */
  }
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/** Applies a theme instantly — no reload, no network. */
export function applyTheme(theme: ThemeName): void {
  const resolved = normaliseTheme(theme)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved])

  cacheTheme(resolved)
}
