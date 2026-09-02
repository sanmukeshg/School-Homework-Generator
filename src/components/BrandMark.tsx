import { useState } from 'react'

interface BrandMarkProps {
  /** Rendered width of the logo, in pixels. */
  size?: number
}

/** The approved Factory AI logo, shipped at 384px from `public/brand/`. */
const LOGO_SRC = `${import.meta.env.BASE_URL}brand/factory-ai.png`

/**
 * Factory AI — Made in India.
 *
 * The logo artwork already carries the wordmark and the Made in India line, so
 * when it loads it stands alone. If the asset is ever missing the image is
 * dropped and a typographic lockup takes its place, so the screen is never
 * broken.
 *
 * The artwork has a white background, so it sits on a white card — that reads
 * as a deliberate lockup in both the light and dark themes.
 */
export function BrandMark({ size = 176 }: BrandMarkProps) {
  const [hasLogo, setHasLogo] = useState(true)

  if (hasLogo) {
    return (
      <div
        className="overflow-hidden rounded-3xl bg-white p-3 shadow-sm ring-1 ring-black/5"
        style={{ width: size, height: size }}
      >
        <img
          src={LOGO_SRC}
          alt="Factory AI — Made in India"
          width={size}
          height={size}
          className="h-full w-full object-contain"
          onError={() => setHasLogo(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-[26px] font-bold leading-none tracking-tight text-ink">
        Factory<span className="text-[#f97316]"> AI</span>
      </p>
      <div className="mt-3 flex items-center gap-2" aria-hidden="true">
        <span className="h-[3px] w-8 rounded-full bg-[#f97316]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Made in India
        </span>
        <span className="h-[3px] w-8 rounded-full bg-[#138808]" />
      </div>
    </div>
  )
}
