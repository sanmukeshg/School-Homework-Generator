import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { getDb } from '../firebase/firestore'
import type { User } from '../firebase/auth'

/** Don't rewrite lastLoginAt on every reload; once an hour is plenty. */
const LOGIN_STAMP_INTERVAL_MS = 60 * 60 * 1000

/**
 * Keeps `users/{uid}` in step with the Google account.
 *
 * Called once per launch. It reads the document first, both to know whether
 * this is the first sign-in and to avoid a pointless write when the profile is
 * unchanged and the last login was recorded recently.
 */
export async function syncUserProfile(user: User): Promise<void> {
  const db = getDb()
  if (!db) return

  const ref = doc(db, 'users', user.uid)
  const profile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  }

  try {
    const existing = await getDoc(ref)

    if (!existing.exists()) {
      await setDoc(ref, {
        ...profile,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      })
      return
    }

    const data = existing.data()
    const lastLogin = data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate() : null
    const profileChanged =
      data.email !== profile.email ||
      data.displayName !== profile.displayName ||
      data.photoURL !== profile.photoURL
    const loginStale = !lastLogin || Date.now() - lastLogin.getTime() > LOGIN_STAMP_INTERVAL_MS

    if (profileChanged || loginStale) {
      await updateDoc(ref, { ...profile, lastLoginAt: serverTimestamp() })
    }
  } catch (error) {
    // Offline, or the write was rejected. The profile is a convenience record;
    // nothing in the app depends on it, so this must never break sign-in.
    console.error('[user] Could not sync the profile', error)
  }
}
