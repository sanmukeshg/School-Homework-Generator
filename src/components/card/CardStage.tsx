import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { CARD_WIDTH } from '../../services/imageService'
import type { HomeworkCard, SchoolSettings } from '../../types'
import { HomeworkPoster } from './HomeworkPoster'

interface CardProps {
  card: HomeworkCard
  settings: SchoolSettings
}

/**
 * Visible preview. The card is always laid out at its natural 520px and then
 * scaled down with a transform, so the phone never scrolls sideways and the
 * proportions match the exported PNG exactly.
 */
export function ScaledCard({ card, settings }: CardProps) {
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
        style={{ width: CARD_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <HomeworkPoster card={card} settings={settings} />
      </div>
    </div>
  )
}

/**
 * Off-screen, unscaled copy of the card used as the html2canvas source. Keeping
 * capture separate from the preview means the export never depends on the
 * phone's screen size.
 */
export const CaptureStage = forwardRef<HTMLDivElement, CardProps>(function CaptureStage(
  { card, settings },
  ref
) {
  return (
    <div className="capture-stage" data-capture-stage aria-hidden="true">
      <HomeworkPoster ref={ref} card={card} settings={settings} />
    </div>
  )
})
