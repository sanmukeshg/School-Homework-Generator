import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

// Inter drives the whole application UI. The poster has its own pair:
// Playfair Display for the school name, Nunito for everything else on it.
// Two separate typography systems, both bundled locally (latin subsets only,
// which keeps the offline precache small):
// Inter for the application UI, Nunito for the generated homework poster.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/playfair-display/latin-800.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'

import App from './App'
import { applyTheme, readCachedTheme } from './services/themeService'
import './styles/index.css'

// Paint the saved theme before React mounts so there is no flash of the wrong one.
applyTheme(readCachedTheme())

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
