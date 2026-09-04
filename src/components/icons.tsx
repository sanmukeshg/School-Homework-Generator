interface IconProps {
  className?: string
}

/** Functional delete control — a real icon, not an emoji. */
export function TrashIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

/** Functional edit control. */
export function PencilIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  )
}

/** Functional add control. Drawn, so it sits exactly in the middle. */
export function PlusIcon({ className = 'h-7 w-7' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** Google's brand mark, for the sign-in button. */
export function GoogleIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84a10.13 10.13 0 0 1-4.4 6.65v5.52h7.12c4.16-3.83 6.56-9.47 6.56-16.18z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.12-5.52c-1.97 1.32-4.49 2.1-7.44 2.1-5.72 0-10.57-3.86-12.3-9.06H4.34v5.7A22 22 0 0 0 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.7 28.19a13.2 13.2 0 0 1 0-8.38v-5.7H4.34a22 22 0 0 0 0 19.78l7.36-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 3.18 29.93 1 24 1A22 22 0 0 0 4.34 13.11l7.36 5.7c1.73-5.2 6.58-9.06 12.3-9.06z"
      />
    </svg>
  )
}

/** Opens the History filter sheet. */
export function FunnelIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.5 5.5h17l-6.6 7.6v5.2l-3.8 2v-7.2z" />
    </svg>
  )
}

/** Marks a settings card as tappable. */
export function ChevronRightIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

/** Opens a calendar field. */
export function CalendarIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  )
}

/** Completed step in the homework flow. */
export function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}

/* -------------------------------------------------------------------------
   Sign-in screen — one icon per promise the app makes. Line art in the
   app's own ink, not illustrations.
   ------------------------------------------------------------------------- */

export function ShieldIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3l7.5 3v5.4c0 4.4-3 8.1-7.5 9.6-4.5-1.5-7.5-5.2-7.5-9.6V6z" />
      <path d="M9.2 12.2l2 2 3.6-3.8" />
    </svg>
  )
}

export function OfflineIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2.5 9.2a15 15 0 0 1 19 0" />
      <path d="M5.8 12.7a10.4 10.4 0 0 1 12.4 0" />
      <path d="M9 16.1a5.2 5.2 0 0 1 6 0" />
      <circle cx="12" cy="19.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TeacherIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.5 6.8L12 3.6l8.5 3.2L12 10z" />
      <path d="M7 8.9v4.4c0 1.7 2.2 3 5 3s5-1.3 5-3V8.9" />
      <path d="M20.5 7v5" />
    </svg>
  )
}
