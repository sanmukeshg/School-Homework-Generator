import { useState } from 'react'
import { BrandMark } from '../components/BrandMark'
import { GoogleIcon, OfflineIcon, ShieldIcon, TeacherIcon } from '../components/icons'
import { useAuth } from '../hooks/useAuth'
import { isAppCheckConfigured } from '../firebase/appCheck'

/** The three promises the app makes, stated once, on the way in. */
const PROMISES = [
  {
    Icon: ShieldIcon,
    title: 'Private',
    line: 'Your homework stays in your own account'
  },
  {
    Icon: OfflineIcon,
    title: 'Works offline',
    line: 'No internet in class? No problem'
  },
  {
    Icon: TeacherIcon,
    title: 'For teachers',
    line: 'A finished card in under a minute'
  }
]

/**
 * The sign-in screen. Google is the only provider, matching what is enabled on
 * the Firebase project.
 *
 * It scrolls rather than compressing: on a short phone the sign-in button is
 * one thumb-scroll away, which is better than shrinking the logo and the
 * promises until neither reads.
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
    <div className="screen">
      <div className="screen-body app-safe-top flex flex-col items-center pt-8">
        <BrandMark size={148} />

        <h1 className="mt-7 text-center text-[28px] font-bold leading-[1.15] tracking-tight text-ink">
          Homework
          <br />
          Generator
        </h1>

        {/* A short rule in the brand green, standing in for the reference's
            gradient underline without borrowing its colours. */}
        <span
          aria-hidden="true"
          className="mt-3 h-[3px] w-14 rounded-full"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgb(var(--c-primary)), rgb(var(--c-primary-2)))'
          }}
        />

        <p className="mt-4 max-w-[19rem] text-center text-sm leading-relaxed text-muted">
          Create the daily homework card and share it with parents.
        </p>

        {/* Promises — three columns on any phone, divided rather than boxed. */}
        <ul className="panel mt-8 grid w-full max-w-md grid-cols-3 gap-0 p-0">
          {PROMISES.map(({ Icon, title, line }, index) => (
            <li
              key={title}
              className={[
                'flex flex-col items-center px-2 py-4 text-center',
                index > 0 ? 'border-l border-line' : ''
              ].join(' ')}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl text-brand"
                style={{ backgroundColor: 'rgb(var(--c-primary) / 0.1)' }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-2.5 text-[12px] font-semibold leading-tight text-ink">{title}</p>
              <p className="mt-1 text-[11px] leading-[1.35] text-muted">{line}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Sign-in stays pinned: the one action on the screen, always in reach. */}
      <div className="app-safe-bottom w-full border-t border-line bg-app/95 px-6 pb-6 pt-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={() => void handleSignIn()}
            disabled={busy || status === 'unavailable'}
            className="btn-primary w-full text-base"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
              <GoogleIcon className="h-4 w-4" />
            </span>
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>

          {problem && (
            <p className="mt-3 text-center text-xs leading-relaxed text-danger" role="alert">
              {problem}
            </p>
          )}

          <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">
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
    </div>
  )
}
