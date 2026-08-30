import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { CARD_WIDTH } from '../../services/imageService'
import type { HomeworkCard, SchoolSettings } from '../../types'
import { HomeworkPoster } from './HomeworkPoster'

interface CardProps {
  card: HomeworkCard
  settings: SchoolSettings
}

/**
 * The one and only poster on screen. It is always laid out at its natural
 * 520px; only the wrapper is scaled down to fit the phone, so the element the
 * user sees is exactly the element the PNG is captured from — there is no
 * second copy and no separate export layout.
 *
 * `ref` points at the poster itself (unscaled), which is what the exporter
 * measures and rasterises.
 */
export const ScaledCard = forwardRef<HTMLDivElement, CardProps>(function ScaledCard(
  { card, settings },
  ref
) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>(undefined)

  const measure = useCallback(() => {
    const wrapper = wrapperRef.current
    const inner = innerRef.current
    if (!wrapper || !inner) return
    const next = Math.min(1, wrapper.clientWidth / CARD_WIDTH)
    setScale(next)
    setHeight(inner.offsetHeight * next)
  }, [])

  useEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    if (wrapperRef.current) observer.observe(wrapperRef.current)
    if (innerRef.current) observer.observe(innerRef.current)
    return () => observer.disconnect()
  }, [measure, card, settings])

  return (
    <div ref={wrapperRef} className="w-full overflow-hidden" style={{ height }}>
      <div
        ref={innerRef}
        style={{
          width: CARD_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          // On the wrapper, not the poster: the export must not include it.
          filter: 'drop-shadow(0 10px 24px rgba(31,36,48,0.22))'
        }}
      >
        <HomeworkPoster ref={ref} card={card} settings={settings} />
      </div>
    </div>
  )
})
