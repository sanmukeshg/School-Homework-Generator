import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'

/**
 * Single place the Firebase App is created.
 *
 * Only the App is initialised here. Auth, Firestore and App Check are added in
 * their own phases and will import `getFirebaseApp()` rather than repeating the
 * configuration — nothing else in the codebase reads the environment directly.
 *
 * The configuration values are public browser identifiers (they name the
 * project; they grant nothing on their own). Real protection comes from
 * Firestore Security Rules and, later, App Check. Service-account credentials
 * and any payment secrets never belong in this bundle.
 */
const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

/** True when every value the SDK needs was supplied at build time. */
export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

export const firebaseProjectId = config.projectId

let app: FirebaseApp | null = null

/**
 * Returns the shared FirebaseApp, creating it on first use.
 *
 * Returns null when the build carried no configuration. The app is offline-first
 * and every screen works from IndexedDB alone, so a missing or unreachable
 * Firebase must never stop it from starting — callers check for null rather
 * than crashing the boot.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null
  if (!app) app = getApps().length ? getApp() : initializeApp(config)
  return app
}

export type FirebaseStatus = 'ready' | 'unconfigured' | 'error'

/**
 * Called once during boot. Creating the app is synchronous and cheap; this
 * wrapper exists so the boot screen has a single awaited entry point and so a
 * failure is reported rather than thrown into React's render path.
 */
export async function initializeFirebase(): Promise<FirebaseStatus> {
  if (!isFirebaseConfigured()) {
    console.warn('[firebase] No configuration in this build — running locally only.')
    return 'unconfigured'
  }

  try {
    getFirebaseApp()
    return 'ready'
  } catch (error) {
    console.error('[firebase] Initialisation failed', error)
    return 'error'
  }
}
