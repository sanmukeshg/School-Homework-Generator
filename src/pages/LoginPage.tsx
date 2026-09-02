import { useState } from 'react'
import { BrandMark } from '../components/BrandMark'
import { GoogleIcon } from '../components/icons'
import { useAuth } from '../hooks/useAuth'
import { isAppCheckConfigured } from '../firebase/appCheck'

/**
 * The sign-in screen. Google is the only provider, matching what is enabled on
 * the Firebase project.
 */
export function LoginPage() {
  const { signIn, status } = useAuth()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function handleSignIn() {
    if (busy) return
    setBusy(true)
    setProblem(null)

    const result = await signIn()
    if (!result.ok) {
      if (result.reason === 'offline') {
        setProblem('Signing in needs an internet connection. Please reconnect and try again.')
      } else if (result.reason === 'unavailable') {
        setProblem('Sign-in is not available in this build.')
      } else if (result.reason === 'error') {
        setProblem(result.message)
      }
      // 'cancelled' is the teacher closing the Google window: say nothing.
    }
    setBusy(false)
  }

  return (
    <div className="screen app-safe-top px-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <BrandMark />

        <h1 className="mt-8 text-xl font-semibold tracking-tight text-ink">Homework Generator</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-muted">
          Create the daily homework card and share it with parents.
        </p>

        <span className="chip-brand mt-5">Free for 6 months</span>
      </div>

      <div className="app-safe-bottom w-full pb-8">
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={busy || status === 'unavailable'}
          className="btn-secondary w-full text-base"
        >
          <GoogleIcon />
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>

        {problem && (
          <p className="mt-3 text-center text-xs leading-relaxed text-danger" role="alert">
            {problem}
          </p>
        )}

        <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
          Your homework stays on your device and in your own account. Nothing is shared with other
          schools.
        </p>

        {/* Required wording when the reCAPTCHA badge is hidden. */}
        {isAppCheckConfigured() && (
          <p className="mt-2 text-center text-[10px] leading-relaxed text-faint">
            This site is protected by reCAPTCHA and the Google{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Terms of Service
            </a>{' '}
            apply.
          </p>
        )}
      </div>
    </div>
  )
}
