/**
 * The stationery scene along the bottom of the poster: grass, pencils, a stack
 * of books and a globe. Pure inline SVG, so it needs no external assets and
 * rasterises with the rest of the poster.
 */
export function PosterFooter() {
  return (
    <svg viewBox="0 0 520 96" className="block h-[96px] w-full" role="presentation">
      {/* Grass */}
      <path d="M0 62 C 70 40, 150 44, 210 58 C 280 74, 350 48, 420 54 C 470 58, 500 68, 520 62 L520 96 L0 96 Z" fill="#93d16f" />
      <path d="M0 76 C 90 62, 180 80, 268 74 C 356 68, 440 84, 520 76 L520 96 L0 96 Z" fill="#6cba52" />

      {/* Pencil, lying flat */}
      <g transform="rotate(-8 96 68)">
        <rect x="44" y="60" width="72" height="13" rx="3" fill="#fcd34d" />
        <rect x="44" y="60" width="72" height="5" rx="2.5" fill="#fde68a" />
        <polygon points="116,60 136,66.5 116,73" fill="#f6d6ac" />
        <polygon points="130,63.5 136,66.5 130,69.5" fill="#4b3a2a" />
        <rect x="36" y="60" width="9" height="13" rx="2" fill="#f472b6" />
      </g>

      {/* Second pencil, angled */}
      <g transform="rotate(24 168 62)">
        <rect x="140" y="56" width="58" height="11" rx="3" fill="#fb923c" />
        <polygon points="198,56 214,61.5 198,67" fill="#f6d6ac" />
        <polygon points="209,59.5 214,61.5 209,63.5" fill="#4b3a2a" />
      </g>

      {/* Stack of books */}
      <g>
        <rect x="212" y="72" width="118" height="14" rx="3" fill="#2563eb" />
        <rect x="212" y="72" width="118" height="4" rx="2" fill="#3b82f6" />
        <rect x="222" y="60" width="98" height="13" rx="3" fill="#dc2626" />
        <rect x="222" y="60" width="98" height="4" rx="2" fill="#ef4444" />
        <rect x="232" y="49" width="78" height="12" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="271" y1="49" x2="271" y2="61" stroke="#cbd5e1" strokeWidth="1.5" />
      </g>

      {/* Small orange book */}
      <g>
        <rect x="338" y="74" width="52" height="12" rx="3" fill="#ea580c" />
        <rect x="338" y="74" width="52" height="4" rx="2" fill="#fb923c" />
      </g>

      {/* Globe */}
      <g>
        <rect x="446" y="80" width="34" height="7" rx="3.5" fill="#b45309" />
        <path d="M463 78 L457 84 L469 84 Z" fill="#b45309" />
        <path d="M441 52 A 22 22 0 0 1 485 52" stroke="#d97706" strokeWidth="4" fill="none" />
        <circle cx="463" cy="52" r="21" fill="#38bdf8" />
        <path d="M447 42 C 455 44, 458 50, 452 56 C 448 60, 444 58, 443 54 Z" fill="#4ade80" />
        <path d="M466 38 C 476 40, 480 48, 474 56 C 468 63, 458 60, 460 52 C 461 46, 462 42, 466 38 Z" fill="#4ade80" />
        <circle cx="463" cy="52" r="21" fill="none" stroke="#0284c7" strokeWidth="1.5" />
        <line x1="463" y1="31" x2="463" y2="73" stroke="#0ea5e9" strokeWidth="1" opacity="0.6" />
        <ellipse cx="463" cy="52" rx="21" ry="8" fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.6" />
      </g>
    </svg>
  )
}
