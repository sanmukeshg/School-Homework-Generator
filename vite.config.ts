import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH lets the same build target GitHub Pages project sites ("/repo/"),
// Netlify / Vercel / Cloudflare Pages ("/") without code changes.
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Homework',
        short_name: 'Homework',
        description: 'Create the daily school homework card and share it to WhatsApp. Works offline.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0d9488',
        background_color: '#f4f6f9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Everything the app needs at runtime is precached, so it boots with no network.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html'
      },
      devOptions: { enabled: false }
    })
  ],
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 1200
  }
})
