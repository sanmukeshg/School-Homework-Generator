import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from 'firebase/firestore'
import { getFirebaseApp } from './app'

/**
 * Cloud Firestore with offline persistence.
 *
 * The persistent cache is what keeps the app usable without a connection:
 * reads are served locally and writes are queued and replayed when the network
 * returns, with no Sync button anywhere. The multi-tab manager lets the same
 * account be open in more than one tab without the tabs fighting over the lease.
 */
let db: Firestore | null = null

export function getDb(): Firestore | null {
  const app = getFirebaseApp()
  if (!app) return null

  if (!db) {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
  }
  return db
}
