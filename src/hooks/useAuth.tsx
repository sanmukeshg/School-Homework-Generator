import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { isFirebaseConfigured } from '../firebase/app'
import {
  completeRedirectSignIn,
  observeAuth,
  signInWithGoogle,
  signOutUser,
  type SignInResult,
  type User
} from '../firebase/auth'

type AuthStatus =
  /** Still working out whether anyone is signed in. */
  | 'loading'
  /** A Google account is signed in. */
  | 'signed-in'
  /** Nobody is signed in. */
  | 'signed-out'
  /** This build has no Firebase configuration, so sign-in cannot happen. */
  | 'unavailable'

interface AuthApi {
  user: User | null
  status: AuthStatus
  signIn: () => Promise<SignInResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    isFirebaseConfigured() ? 'loading' : 'unavailable'
  )

  useEffect(() => {
    if (!isFirebaseConfigured()) return

    // If the app has just come back from Google's redirect flow, settle that
    // first so the listener below reports the signed-in user straight away.
    void completeRedirectSignIn()

    const unsubscribe = observeAuth((next) => {
      setUser(next)
      setStatus(next ? 'signed-in' : 'signed-out')
    })
    return unsubscribe
  }, [])

  const signIn = useCallback(async () => {
    const result = await signInWithGoogle()
    return result
  }, [])

  const handleSignOut = useCallback(async () => {
    await signOutUser()
  }, [])

  const api = useMemo<AuthApi>(
    () => ({ user, status, signIn, signOut: handleSignOut }),
    [user, status, signIn, handleSignOut]
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
