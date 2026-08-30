import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
 * Sizing is deliberately one-directional. An earlier version observed both the
 * wrapper and the poster and wrote the measured height back onto the wrapper,
 * which on Android could feed back through the scroll container and leave the
 * preview visibly shaking. Now the poster's natural height is read only when
 * its content changes, the wrapper's width is the only thing observed, and a
 * value has to move by more than half a pixel before any state is written.
 */
export const ScaledCard = forwardRef<HTMLDivElement, CardProps>(function ScaledCard(
  { card, settings },
  ref
) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLDivElement | null>(null)
  const frame = useRef(0)

  const [available, setAvailable] = useState(CARD_WIDTH)
  const [naturalHeight, setNaturalHeight] = useState(0)

  /** Keeps our own ref while still handing the poster node to the parent. */
  const attachPoster = useCallback(
    (node: HTMLDivElement | null) => {
      posterRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  const readHeight = useCallback(() => {
    const poster = posterRef.current
    if (!poster) return
    const next = poster.offsetHeight
    setNaturalHeight((current) => (Math.abs(current - next) > 0.5 ? next : current))
  }, [])

  // The poster's height depends only on its content, never on our wrapper.
  useLayoutEffect(() => {
    readHeight()
  }, [readHeight, card, settings])

  // Web fonts change text metrics, so re-read once they have settled.
  useEffect(() => {
    let cancelled = false
    document.fonts?.ready
      ?.then(() => {
        if (!cancelled) readHeight()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [readHeight])

  // Width is the only thing observed, and only width is read from it.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const apply = () => {
      const width = wrapper.clientWidth
      setAvailable((current) => (Math.abs(current - width) > 0.5 ? width : current))
    }

    apply()
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(apply)
    })
    observer.observe(wrapper)
    return () => {
      cancelAnimationFrame(frame.current)
      observer.disconnect()
    }
  }, [])

  const scale = Math.min(1, available / CARD_WIDTH)

  return (
    <div
      ref={wrapperRef}
      className="w-full overflow-hidden"
      style={{ height: naturalHeight ? Math.ceil(naturalHeight * scale) : undefined }}
    >
      <div
        style={{
          width: CARD_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          willChange: 'transform'
        }}
      >
        <HomeworkPoster ref={attachPoster} card={card} settings={settings} />
      </div>
    </div>
  )
})
