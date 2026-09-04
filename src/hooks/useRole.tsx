import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { useAuth } from './useAuth'
import { checkIsAdmin } from '../services/adminService'

interface RoleApi {
  /** True when this account has an `admins/{uid}` document. */
  isAdmin: boolean
  /** False until the role has been decided, so nothing flashes. */
  ready: boolean
  /**
   * An administrator has asked to look at the teacher app. Deliberately not
   * persisted: it lasts for this session and resets on reload, so nobody
   * quietly stays in the wrong experience.
   */
  previewingApp: boolean
  setPreviewingApp: (value: boolean) => void
}

const RoleContext = createContext<RoleApi | null>(null)

/**
 * Decides which experience the signed-in account gets.
 *
 * This is presentation only. Every actual permission is enforced by the
 * Firestore Security Rules on each request, so a teacher who forced this flag
 * true in a debugger would see an Admin Panel whose every read came back empty
 * and whose every write was refused.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [ready, setReady] = useState(false)
  const [previewingApp, setPreviewingApp] = useState(false)

  useEffect(() => {
    let cancelled = false

    // No account, or a build with no Firebase: there is no role to look up.
    if (status === 'loading') return
    if (status !== 'signed-in' || !user) {
      setIsAdmin(false)
      setPreviewingApp(false)
      setReady(true)
      return
    }

    setReady(false)
    void checkIsAdmin(user.uid).then((result) => {
      if (cancelled) return
      setIsAdmin(result)
      setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [user, status])

  const setPreview = useCallback((value: boolean) => setPreviewingApp(value), [])

  const api = useMemo<RoleApi>(
    () => ({ isAdmin, ready, previewingApp, setPreviewingApp: setPreview }),
    [isAdmin, ready, previewingApp, setPreview]
  )

  return <RoleContext.Provider value={api}>{children}</RoleContext.Provider>
}

export function useRole(): RoleApi {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>')
  return ctx
}
