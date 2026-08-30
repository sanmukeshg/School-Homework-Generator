interface SubjectGlyphProps {
  glyph: string
  color: string
  size?: number
}

/**
 * The small picture beside each subject on the poster. Drawn inline so it
 * needs no assets, rasterises with the rest of the card, and stays legible at
 * the size WhatsApp compresses the image to.
 */
export function SubjectGlyph({ glyph, color, size = 22 }: SubjectGlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  }

  switch (glyph) {
    case 'maths':
      return (
        <svg {...common}>
          <path d="M4 7h5M6.5 4.5v5" />
          <path d="M15 7h5" />
          <path d="M4.8 15.8l3.4 3.4M8.2 15.8l-3.4 3.4" />
          <path d="M15 15h5M15 19h5" />
        </svg>
      )
    case 'science':
      return (
        <svg {...common}>
          <path d="M10 3h4M11 3v6.2L6.4 17.4A2 2 0 0 0 8.1 20.5h7.8a2 2 0 0 0 1.7-3.1L13 9.2V3" />
          <path d="M8.6 15h6.8" />
        </svg>
      )
    case 'globe':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5S14.4 18.1 12 20.5c-2.4-2.4-3.6-5.3-3.6-8.5S9.6 5.9 12 3.5z" />
        </svg>
      )
    case 'leaf':
      return (
        <svg {...common}>
          <path d="M5 19c0-7 5-12 14-12 0 9-5 13-11 13-1.2 0-2.2-.3-3-1z" />
          <path d="M5 19c3-4 6-6.5 10-8" />
        </svg>
      )
    case 'computer':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="11" rx="1.6" />
          <path d="M2 19.5h20" />
        </svg>
      )
    case 'bulb':
      return (
        <svg {...common}>
          <path d="M9.2 16.5a6 6 0 1 1 5.6 0" />
          <path d="M9.5 18.5h5M10.5 21h3" />
        </svg>
      )
    case 'art':
      return (
        <svg {...common}>
          <path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8s3.8 7.2 8.5 7.2c1.4 0 2.2-.9 2.2-1.9 0-1.5-1.4-1.7-1.4-2.9 0-.9.8-1.5 1.9-1.5h1.6c2.6 0 4.2-1.7 4.2-4.1 0-2.9-3.4-4.8-8.5-4.8z" />
          <circle cx="8" cy="10" r="1.1" fill={color} stroke="none" />
          <circle cx="12" cy="8" r="1.1" fill={color} stroke="none" />
          <circle cx="16" cy="10.5" r="1.1" fill={color} stroke="none" />
        </svg>
      )
    case 'language':
      return (
        <svg {...common}>
          <path d="M3.5 5.5h11v9h-6L5 18v-3.5H3.5z" />
          <path d="M6.5 9h5M6.5 11.5h3" />
          <path d="M15 10.5h5.5v8H18l-2.5 2.5V18.5H15z" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2.5 2.5 0 0 1 2 1v13a2.5 2.5 0 0 0-2-1H5.5A1.5 1.5 0 0 1 4 15.5z" />
          <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2.5 2.5 0 0 0-2 1v13a2.5 2.5 0 0 1 2-1h4.5a1.5 1.5 0 0 0 1.5-1.5z" />
        </svg>
      )
  }
}

/** Loudspeaker for the announcement heading. */
export function SpeakerGlyph({ size = 15, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9.5h3.5L13 5.5v13L7.5 14.5H4z" />
      <path d="M16.5 9a4.2 4.2 0 0 1 0 6" />
      <path d="M19 6.5a7.6 7.6 0 0 1 0 11" />
    </svg>
  )
}
