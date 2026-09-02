import { useState } from 'react'

interface BrandMarkProps {
  /** Rendered size of the logo, in pixels. */
  size?: number
}

/** Where the approved Factory AI logo lives once it is added to the repo. */
const LOGO_SRC = `${import.meta.env.BASE_URL}brand/factory-ai.png`

/**
 * Factory AI — Made in India.
 *
 * Shows the approved logo when the asset is present. If it is missing the
 * image is dropped and the wordmark alone is shown, so the boot screen is
 * always complete rather than displaying a broken image.
 */
export function BrandMark({ size = 132 }: BrandMarkProps) {
  const [hasLogo, setHasLogo] = useState(true)

  return (
    <div className="flex flex-col items-center">
      {hasLogo && (
        <img
          src={LOGO_SRC}
          alt="Factory AI"
          width={size}
          height={size}
          className="mb-4 object-contain"
          style={{ width: size, height: size }}
          onError={() => setHasLogo(false)}
        />
      )}

      <p
        className="text-[26px] font-bold leading-none tracking-tight text-ink"
        aria-label="Factory AI"
      >
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
