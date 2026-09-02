import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
  type AppCheck
} from 'firebase/app-check'
import type { FirebaseApp } from 'firebase/app'

/**
 * Firebase App Check.
 *
 * App Check attaches an attestation to every Firebase request, so the backend
 * can tell traffic from this app apart from a script someone points at the
 * project. It complements the Security Rules — rules decide what a signed-in
 * user may touch, App Check decides whether the caller is the real app.
 *
 * Three deliberate choices:
 *
 * - It is optional. With no site key configured the module does nothing, so a
 *   developer clone, a CI build and the GitHub Pages build all keep working.
 * - It never throws into boot. A failed attestation must not stop a teacher
 *   opening an offline-capable app.
 * - Enforcement is a Console setting and stays off until the token supply has
 *   been verified in the App Check metrics. Shipping this client-side code
 *   first is what makes turning enforcement on safe.
 */
export type AppCheckStatus = 'ready' | 'unconfigured' | 'error'

type ProviderName = 'recaptcha-v3' | 'recaptcha-enterprise'

const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY as string | undefined
const providerName = (import.meta.env.VITE_APPCHECK_PROVIDER ?? 'recaptcha-v3') as ProviderName
const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined

let appCheck: AppCheck | null = null

export function isAppCheckConfigured(): boolean {
  return Boolean(siteKey)
}

/**
 * Registers this browser as a debug client.
 *
 * Only in a development build. Set VITE_APPCHECK_DEBUG_TOKEN to a token you
 * registered in the Console to reuse one, or to `true` to have the SDK print a
 * fresh token to the console for registering. A debug token bypasses
 * attestation, so it must never reach a production bundle — hence the DEV
 * guard rather than a runtime hostname check.
 */
function enableDebugTokenInDevelopment(): void {
  if (!import.meta.env.DEV || !debugToken) return

  const target = self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
  target.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken
  console.info('[app-check] Debug token active for this development build.')
}

function createProvider(): ReCaptchaV3Provider | ReCaptchaEnterpriseProvider {
  return providerName === 'recaptcha-enterprise'
    ? new ReCaptchaEnterpriseProvider(siteKey as string)
    : new ReCaptchaV3Provider(siteKey as string)
}

/**
 * Installs App Check on the app. Call once, straight after the FirebaseApp is
 * created and before Auth or Firestore issue their first request, so tokens
 * are attached from the very first call.
 */
export function initializeApplicationCheck(app: FirebaseApp): AppCheckStatus {
  if (!isAppCheckConfigured()) {
    console.info('[app-check] No site key in this build — App Check is inactive.')
    return 'unconfigured'
  }

  if (appCheck) return 'ready'

  try {
    enableDebugTokenInDevelopment()
    appCheck = initializeAppCheck(app, {
      provider: createProvider(),
      // Keeps a valid token in hand so a save never waits on attestation.
      isTokenAutoRefreshEnabled: true
    })
    return 'ready'
  } catch (error) {
    // A bad key, a blocked reCAPTCHA script, or no network on first load. With
    // enforcement off this changes nothing; with it on, requests fail and are
    // retried, which is still better than refusing to start.
    console.error('[app-check] Could not initialise; continuing without it', error)
    return 'error'
  }
}
