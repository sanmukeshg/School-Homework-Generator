import { useEffect, useState } from 'react'

/** Below Tailwind's `md`, which is where this app's phone layout applies. */
const MOBILE_QUERY = '(max-width: 767px)'

/**
 * Whether the viewport is phone-sized.
 *
 * Used to keep the Admin Panel a mobile-only surface. It decides what is drawn
 * and nothing else — the Security Rules are what actually grant or refuse
 * access, so a wider window hides the panel without weakening anything, and a
 * narrower one reveals it without granting anything.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  )

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    setIsMobile(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
