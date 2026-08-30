# Homework Generator

A small offline app for one teacher's phone. Open it, pick a class and section, type the
homework, preview the poster, share the PNG to the parents' WhatsApp group.

- **No login, no server, no cloud.** Everything lives in IndexedDB on the phone.
- **Works with the network off** once installed.
- **Many cards a day** — one per class/section (`30 Aug → Class 1 → A`, `30 Aug → Class 1 → B`, …).
- **Two design systems, kept apart:** a clean, professional app UI (Inter, no decorative
  icons) and a colourful school poster for the generated image.

## Stack

React · TypeScript · Vite · Tailwind CSS · IndexedDB (`idb`) · `html2canvas` · Web Share API ·
`vite-plugin-pwa` (Workbox). Fonts are bundled locally through `@fontsource`; nothing is
loaded from a CDN at runtime.

## 1. Run locally

```bash
npm install
npm run dev
```

Then open the printed URL. To try it as it behaves on a phone, use your browser's device
toolbar (375 x 812 is a good size), or open the URL on your phone over the same Wi-Fi with
`npm run dev -- --host`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (service worker disabled) |
| `npm run build` | Type-check and produce the production bundle in `dist/` |
| `npm run preview` | Serve `dist/` locally — use this to test the PWA and offline mode |
| `npm run icons` | Regenerate `public/icons/*` from `scripts/generate-icons.mjs` |
| `npm run typecheck` | Types only, no bundle |

## 2. Build

```bash
npm run build
```

The output in `dist/` is a plain static site: HTML, JS, CSS, fonts, icons, a web app
manifest and a Workbox service worker. There is no backend to deploy.

If the site will be served from a sub-path (e.g. a GitHub Pages project site at
`/almanac-homework/`), set the base when building:

```bash
BASE_PATH=/almanac-homework/ npm run build
```

Routing uses hash URLs (`#/edit/<id>`, `#/history`), so deep links work on any static host
with no rewrite rules.

## 3. Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes
it to GitHub Pages. One-time setup in the repository: **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

The workflow sets `BASE_PATH` from the repository name automatically. After the first
successful run, the hosted URL is shown in the workflow run (the `github-pages` environment
URL on the **deploy** job) and under **Settings → Pages**.

Any other static host works too — upload `dist/` to Netlify, Vercel, Cloudflare Pages or
plain web hosting, building with `BASE_PATH=/` when it is served from a domain root.

## 4. Install on Android

1. Open the hosted URL in Chrome.
2. Tap **⋮** → **Add to Home screen** (Chrome usually also offers an *Install app* prompt).
3. Confirm. The app appears in the launcher with its own icon.
4. Open it from the Home screen — it launches full screen, without browser chrome.

## 5. Install on iPhone

1. Open the hosted URL in **Safari** (installation does not work from Chrome on iOS).
2. Tap the **Share** button, scroll down, tap **Add to Home Screen**, then **Add**.
3. Launch it from the Home screen. It runs standalone and respects the notch/safe areas.

On iPhone the native share sheet is available from the installed app, so **Share to
WhatsApp** works. If a browser refuses file sharing, the app falls back to downloading the
PNG and says so.

## 6. Daily flow

```
Home  →  +  →  Class · Section · Date  →  Life Skill  →  Word of the Day  →  Homework
      →  Save  →  Preview  →  Share to WhatsApp
```

Home is a dashboard of the cards created today. Tapping **+** starts another card — for the
next class — without touching the one already saved.

**One card per date + class + section.** If you pick a combination that already exists, the
app says so and offers to open the existing card rather than creating a duplicate.

**Required before saving:** class, section, word, meaning and synonym. Meaning is not
optional — it is printed on the poster next to the word.

## 7. Appearance

**Settings → Appearance** is a single Light / Dark toggle. A fresh installation starts in
Light; an explicit choice is stored in IndexedDB (mirrored to `localStorage` so the first
paint is already correct), applies instantly with no reload, and survives closing the app,
restarting the phone and being offline.

The generated homework PNG is deliberately unaffected — it always keeps its own colourful
design in both themes.

## 8. How offline storage works

- **Application shell** — the service worker precaches every JS, CSS, font and icon file at
  install time. After the first load the app boots with no network at all. Updates are
  fetched in the background and applied on the next launch (`registerType: 'autoUpdate'`).
- **Your data** — IndexedDB database `almanac-homework` (schema v2), three stores:
  - `settings` — school name, initials, logo (a resized data URL), default subjects, the
    class and section lists, and the chosen theme.
  - `cards` — one record per **date + class + section**, keyed by a generated card id, with
    indexes `by-date` and `by-slot` (`[date, classId, sectionId]`). Holds the date, day,
    class, section, life skill, word/meaning/synonym, every subject row and timestamps.
  - `drafts` — a rolling copy of the card being edited, keyed by that card's id, written a
    few hundred milliseconds after you stop typing. One class's draft can never overwrite
    another's. Saving promotes the draft to a card and deletes it.
  - *Migration:* v1 databases (one card per date, no class/section) upgrade in place. Those
    cards are kept and show as "Class not set" until you open and assign them. Retired
    settings fields and theme values are normalised on load.
- **PNG generation** happens on the device with `html2canvas` at 2.5x scale (a 1300px wide
  image; the height grows with the number of subjects), saved as
  `Homework_Class_5_C_30_August_2026.png`.

Nothing — not homework text, the school name, the logo, nor the generated image — is ever
sent anywhere. There is no analytics.

The flip side of local-only storage: the data is tied to this browser on this phone.
Clearing site data, or switching phone, loses it. That is what backups are for.

## 9. Backup and restore

**Settings → Backup & Restore**

- **Export backup (.json)** writes `Homework_Backup_2026-08-30.json` to your downloads,
  containing the school settings (including classes and sections) and every saved card.
- **Restore from backup** merges a previously exported file back in. Cards are keyed by id,
  so restoring twice is harmless and an old backup does not delete newer cards. Version 1
  backups are upgraded on the way in.
- **Delete all local data** (under *Reset*) wipes settings, cards and drafts. Export first.

## 10. Academic setup

**Settings → Academic Setup** holds the class list (Nursery, LKG, UKG, Class 1–10 by
default) and the section list (A–D). Add or remove entries there; the editor's dropdowns
read straight from it. Defaults live in `src/data/academics.ts`, the school's own copy in
`SchoolSettings` — no component hard-codes them.

## Project structure

```
src/
  components/     app chrome (top bar, pill nav, modal) and the poster
    card/         HomeworkPoster — the frozen design of the exported PNG
  pages/          Home, Editor, Preview, History, Settings
  services/       IndexedDB reads/writes, PNG export, sharing, backup, theme, WhatsApp text
  db/             IndexedDB connection, schema and the v1 → v2 migration
  hooks/          settings context, toast, the card editor, debounce
  data/           classes/sections, subject presets, life skills, vocabulary
  types/          shared TypeScript types
  utils/          dates, ids, file helpers
  styles/         theme tokens, Tailwind entry, poster CSS
scripts/          dependency-free PWA icon generator
```

Two typography systems on purpose: the app UI uses **Inter** with semantic colour tokens
(`bg-surface`, `text-ink`, `border-line`, …) so both themes work, and the poster uses
**Nunito** with a fixed palette so the PNG never changes.
