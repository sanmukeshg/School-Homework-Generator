import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { onHomeworkSynced, pullHomework, pullIfStale, resetSyncState } from '../services/homeworkSync'
import { setActiveUid } from '../services/session'

/**
 * Drives homework synchronisation.
 *
 * Sets the account the data services write for, pulls the history once on
 * sign-in, and refreshes when the app comes back to the foreground after the
 * cache has gone stale. No polling and no listener on the homework collection:
 * homework only changes when this teacher changes it.
 */
export function useHomeworkSync(): void {
  const { user, status } = useAuth()

  useEffect(() => {
    if (status !== 'signed-in' || !user) {
      setActiveUid(null)
      resetSyncState()
      return
    }

    setActiveUid(user.uid)
    void pullHomework(user.uid)

    const refresh = () => {
      if (document.visibilityState === 'visible') void pullIfStale(user.uid)
    }

    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    // Coming back online is the other moment worth re-checking.
    window.addEventListener('online', refresh)

    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [status, user])
}

/**
 * Increments whenever a sync completes. Screens put it in their effect
 * dependencies so a pull refreshes what is already on screen.
 */
export function useHomeworkSyncSignal(): number {
  const [signal, setSignal] = useState(0)

  useEffect(() => onHomeworkSynced(() => setSignal((value) => value + 1)), [])

  return signal
}
