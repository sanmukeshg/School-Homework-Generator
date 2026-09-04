/**
 * The app's version, in one place.
 *
 * The value is injected by Vite from `package.json` (see `vite.config.ts`), so
 * a release is a single edit there and every screen that shows a version — the
 * sign-in screen and the foot of Settings — follows automatically. Nothing
 * should ever write a version number inline.
 */
export const APP_VERSION: string = __APP_VERSION__

/** The short form, e.g. "v2.1.1" — for a corner of the sign-in screen. */
export const APP_VERSION_SHORT = `v${APP_VERSION}`

/** The long form, e.g. "Version 2.1.1" — for the end of Settings. */
export const APP_VERSION_LABEL = `Version ${APP_VERSION}`
