import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getRedirectResult,
  GoogleAuthProvider,
  initializeAuth,
  indexedDBLocalPersistence,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User
} from 'firebase/auth'
import { getFirebaseApp } from './app'

/**
 * Firebase Authentication, Google only.
 *
 * Persistence is IndexedDB first so a signed-in teacher stays signed in across
 * launches and, importantly, still resolves while offline — the session is read
 * from local storage, not the network.
 */
let auth: Auth | null = null

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp()
  if (!app) return null

  if (!auth) {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      // initializeAuth installs no default resolver, and without one every
      // popup or redirect sign-in fails with auth/argument-error.
      popupRedirectResolver: browserPopupRedirectResolver
    })
  }
  return auth
}

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider()
  // Always let the teacher pick which Google account to use.
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

/** The user cancelled the sign-in themselves; not something to report as a fault. */
const CANCELLED = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled'
])

/** A popup cannot work here, so the whole page has to go to Google instead. */
const NEEDS_REDIRECT = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported'
])

export type SignInResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'offline' | 'unavailable'; message?: string }
  | { ok: false; reason: 'error'; message: string }

function errorCode(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
}

/**
 * Signs in with Google. Tries a popup first because it keeps the app's state,
 * and falls back to a full-page redirect where popups are unavailable — an
 * installed PWA on iOS being the usual case.
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  const instance = getFirebaseAuth()
  if (!instance) return { ok: false, reason: 'unavailable' }
  if (!navigator.onLine) return { ok: false, reason: 'offline' }

  try {
    await signInWithPopup(instance, googleProvider(), browserPopupRedirectResolver)
    return { ok: true }
  } catch (error) {
    const code = errorCode(error)
    if (CANCELLED.has(code)) return { ok: false, reason: 'cancelled' }

    if (NEEDS_REDIRECT.has(code)) {
      try {
        await signInWithRedirect(instance, googleProvider(), browserPopupRedirectResolver)
        // The page navigates away; getRedirectResult() picks it up on return.
        return { ok: true }
      } catch (redirectError) {
        return { ok: false, reason: 'error', message: describe(redirectError) }
      }
    }

    if (code === 'auth/network-request-failed') return { ok: false, reason: 'offline' }
    return { ok: false, reason: 'error', message: describe(error) }
  }
}

function describe(error: unknown): string {
  const code = errorCode(error)
  if (code === 'auth/unauthorized-domain') {
    return 'This web address is not authorised for sign-in in Firebase.'
  }
  if (code) return `Sign-in failed (${code.replace('auth/', '')}).`
  return 'Sign-in failed. Please try again.'
}

export async function signOutUser(): Promise<void> {
  const instance = getFirebaseAuth()
  if (instance) await signOut(instance)
}

/**
 * Completes a redirect sign-in if the app has just come back from Google.
 * Safe to call on every boot: it resolves to null when there is nothing pending.
 */
export async function completeRedirectSignIn(): Promise<void> {
  const instance = getFirebaseAuth()
  if (!instance) return
  try {
    await getRedirectResult(instance, browserPopupRedirectResolver)
  } catch (error) {
    console.error('[auth] Redirect sign-in did not complete', error)
  }
}

/** Subscribes to sign-in state. Returns an unsubscribe function. */
export function observeAuth(callback: (user: User | null) => void): () => void {
  const instance = getFirebaseAuth()
  if (!instance) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(instance, callback)
}

export type { User }
