import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData
} from 'firebase/firestore'
import { getDb } from '../firebase/firestore'
import type { SchoolSettings } from '../types'
import { withDefaults } from './settingsService'

/**
 * School settings in the cloud: `users/{uid}/settings/school`.
 *
 * One document, because the settings are one small object that is read and
 * written as a whole. Firestore's persistent cache serves it offline and
 * replays writes when the connection returns, so there is no Sync button.
 */
export const SETTINGS_SCHEMA_VERSION = 2

function settingsRef(uid: string) {
  const db = getDb()
  return db ? doc(db, 'users', uid, 'settings', 'school') : null
}

/** Everything the app needs to reconstruct settings on another device. */
function toCloud(settings: SchoolSettings) {
  return {
    schoolName: settings.schoolName,
    initials: settings.initials,
    logoDataUrl: settings.logoDataUrl,
    defaultSubjects: settings.defaultSubjects,
    classes: settings.classes,
    sections: settings.sections,
    customSubjects: settings.customSubjects,
    removedSubjects: settings.removedSubjects,
    theme: settings.theme,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAt: serverTimestamp()
  }
}

function fromCloud(data: DocumentData): SchoolSettings {
  // withDefaults fills anything a newer field added since this document was
  // written, and normalises retired values, exactly as the local path does.
  return withDefaults({
    schoolName: data.schoolName,
    initials: data.initials,
    logoDataUrl: data.logoDataUrl ?? null,
    defaultSubjects: data.defaultSubjects,
    classes: data.classes,
    sections: data.sections,
    customSubjects: data.customSubjects,
    removedSubjects: data.removedSubjects,
    theme: data.theme,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0
  })
}

/**
 * Watches the cloud copy. The callback receives null when the account has no
 * settings document yet — a first sign-in, or a brand new device.
 */
export function observeCloudSettings(
  uid: string,
  callback: (settings: SchoolSettings | null) => void
): () => void {
  const ref = settingsRef(uid)
  if (!ref) {
    callback(null)
    return () => {}
  }

  return onSnapshot(
    ref,
    (snapshot) => callback(snapshot.exists() ? fromCloud(snapshot.data()) : null),
    (error) => {
      console.error('[settings] Could not read cloud settings', error)
      callback(null)
    }
  )
}

export async function getCloudSettings(uid: string): Promise<SchoolSettings | null> {
  const ref = settingsRef(uid)
  if (!ref) return null
  const snapshot = await getDoc(ref)
  return snapshot.exists() ? fromCloud(snapshot.data()) : null
}

/**
 * Writes the whole settings object. Offline this is queued by Firestore and
 * sent when the connection returns, so callers never have to care.
 */
export async function saveCloudSettings(uid: string, settings: SchoolSettings): Promise<void> {
  const ref = settingsRef(uid)
  if (!ref) return
  await setDoc(ref, toCloud(settings))
}
