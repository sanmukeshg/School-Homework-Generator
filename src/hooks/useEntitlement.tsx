import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { useAuth } from './useAuth'
import { evaluateEntitlement, type Entitlement } from '../services/entitlementService'
import { ensureSubscription, observeSubscription, type SubscriptionRecord } from '../services/subscriptionService'
import { syncUserProfile } from '../services/userService'

interface EntitlementApi {
  subscription: SubscriptionRecord | null
  entitlement: Entitlement
  /** False while the first read of the account record is still in flight. */
  ready: boolean
}

const EntitlementContext = createContext<EntitlementApi | null>(null)

/**
 * Provisions the account on first sign-in and keeps its entitlement in view.
 *
 * On sign-in it records the profile, makes sure a subscription record exists —
 * both are no-ops on later launches — and then watches the record so a change
 * made on another device, or by a future payment webhook, arrives here without
 * a reload.
 */
export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (status !== 'signed-in' || !user) {
      setSubscription(null)
      setReady(status !== 'loading')
      return
    }

    let cancelled = false
    setReady(false)

    // Live updates first, so a record created below arrives through the same
    // path as one changed on another device.
    const unsubscribe = observeSubscription(user.uid, (record) => {
      if (cancelled) return
      setSubscription(record)
      if (record) setReady(true)
    })

    void (async () => {
      await syncUserProfile(user)
      try {
        const record = await ensureSubscription(user.uid)
        if (!cancelled && record) setSubscription(record)
      } catch (error) {
        // Offline on first launch, most likely. The snapshot listener will
        // deliver the record as soon as the connection returns.
        console.error('[entitlement] Could not provision the account', error)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [status, user])

  const api = useMemo<EntitlementApi>(
    () => ({ subscription, entitlement: evaluateEntitlement(subscription), ready }),
    [subscription, ready]
  )

  return <EntitlementContext.Provider value={api}>{children}</EntitlementContext.Provider>
}

export function useEntitlement(): EntitlementApi {
  const ctx = useContext(EntitlementContext)
  if (!ctx) throw new Error('useEntitlement must be used inside <EntitlementProvider>')
  return ctx
}
