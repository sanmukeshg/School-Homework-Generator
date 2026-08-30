/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Application UI — one clean, professional face everywhere.
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        // Generated homework poster only.
        card: ['Nunito', 'Inter', 'system-ui', 'sans-serif'],
        // The school name at the top of the poster.
        display: ['Playfair Display', 'Georgia', 'serif']
      },
      /**
       * Semantic colours only — every one resolves to a CSS variable that the
       * Light and Dark themes redefine. The homework poster deliberately does
       * NOT use these; it keeps its own fixed palette so the exported PNG never
       * changes with the app theme.
       */
      colors: {
        app: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        line: 'rgb(var(--c-border) / <alpha-value>)',
        ink: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        brand: 'rgb(var(--c-primary) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)'
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)'
      }
    }
  },
  plugins: []
}
