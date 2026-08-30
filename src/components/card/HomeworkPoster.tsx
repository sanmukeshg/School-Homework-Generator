import { forwardRef } from 'react'
import { formatClassSectionLong } from '../../data/academics'
import { getPreset } from '../../data/subjects'
import { CARD_WIDTH } from '../../services/imageService'
import type { HomeworkCard, SchoolSettings } from '../../types'
import { stripSubjectPrefix } from '../../utils/text'
import { PosterFooter } from './PosterFooter'

interface HomeworkPosterProps {
  card: HomeworkCard
  settings: SchoolSettings
}

/**
 * Row metrics shrink as subjects are added so 1 or 10 subjects both stay
 * readable and inside the poster instead of overflowing it.
 */
function homeworkMetrics(count: number) {
  if (count <= 5) return { padY: 9, task: 15, label: 14 }
  if (count <= 8) return { padY: 7, task: 13.5, label: 12.5 }
  return { padY: 5, task: 12.5, label: 11.5 }
}

function fitText(text: string, sizes: [number, number, number], breaks: [number, number]): number {
  if (text.length > breaks[1]) return sizes[2]
  if (text.length > breaks[0]) return sizes[1]
  return sizes[0]
}

/**
 * The generated homework image. Fixed 520px wide so the exported PNG looks
 * identical on every phone; the preview screen scales the wrapper, never this.
 *
 * This design is frozen: it has its own palette and typography and is never
 * affected by the application's Light/Dark theme.
 */
export const HomeworkPoster = forwardRef<HTMLDivElement, HomeworkPosterProps>(
  function HomeworkPoster({ card, settings }, ref) {
    // Subjects with no task would print as an empty line, so they stay off.
    const items = card.items.filter((item) => item.task.trim())
    const metrics = homeworkMetrics(items.length)
    const classLine = formatClassSectionLong(settings, card).toUpperCase().replace(/·/g, '•')
    const schoolSize = fitText(settings.schoolName, [25, 21, 18], [24, 38])
    const skillSize = fitText(card.lifeSkill, [20, 18, 16], [58, 92])
    const meaningSize = fitText(card.meaning, [13, 12, 11], [46, 74])

    return (
      <div
        ref={ref}
        data-capture-root
        className="poster relative overflow-hidden"
        style={{
          width: CARD_WIDTH,
          borderRadius: 30,
          border: '6px solid #f0b429',
          boxShadow: '0 10px 30px rgba(31,36,48,0.25)'
        }}
      >
        {/* Soft sunburst, as in the reference */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 70% at 90% -10%, rgba(253,224,71,0.55) 0%, rgba(253,224,71,0) 60%)'
          }}
        />

        <div className="relative px-5 pt-5">
          {/* School identity */}
          <div className="flex items-center gap-4">
            <div
              className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"
              style={{ width: 76, height: 76, border: '3px solid #e8a33d' }}
            >
              {settings.logoDataUrl ? (
                <img src={settings.logoDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className="px-1 text-center font-extrabold uppercase leading-none"
                  style={{ color: '#7a1414', fontSize: 20, letterSpacing: '0.02em' }}
                >
                  {settings.initials || 'SCH'}
                </span>
              )}
            </div>

            {/* The school's identity: its own display face, wrapping to a
                second line for long names. */}
            <h1
              className="poster-school flex-1 text-center uppercase"
              style={{
                color: '#7a1414',
                fontSize: schoolSize,
                lineHeight: 1.14,
                letterSpacing: '0.01em',
                textWrap: 'balance'
              }}
            >
              {settings.schoolName}
            </h1>
          </div>

          {/* Class and section — the first thing a parent reads. The ribbon is
              an SVG polygon rather than a CSS clip-path so every renderer, the
              PNG exporter included, draws the same shape. */}
          {classLine && (
            <div className="mt-3 flex justify-center">
              <div className="relative inline-flex items-center gap-2.5 px-9 py-1.5">
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="bannerFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e23b3b" />
                      <stop offset="100%" stopColor="#c81e1e" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="4,0 96,0 100,50 96,100 4,100 0,50"
                    fill="url(#bannerFill)"
                  />
                </svg>
                <span className="relative" style={{ color: '#ffd84d', fontSize: 15 }}>
                  ★
                </span>
                <span
                  className="relative font-extrabold uppercase text-white"
                  style={{ fontSize: 19, letterSpacing: '0.04em' }}
                >
                  {classLine}
                </span>
                <span className="relative" style={{ color: '#ffd84d', fontSize: 15 }}>
                  ★
                </span>
              </div>
            </div>
          )}

          {/* Date and day */}
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <div
              className="poster-panel py-2.5 text-center"
              style={{ backgroundColor: '#fde9ee', borderColor: '#f5b6c4' }}
            >
              <div
                className="font-extrabold uppercase"
                style={{ color: '#c2255c', fontSize: 12, letterSpacing: '0.14em' }}
              >
                Date
              </div>
              <div className="font-extrabold" style={{ fontSize: 20, color: '#1f2430' }}>
                {card.displayDate}
              </div>
            </div>

            <div
              className="poster-panel py-2.5 text-center"
              style={{ backgroundColor: '#e7f8ea', borderColor: '#a6ddb0' }}
            >
              <div
                className="font-extrabold uppercase"
                style={{ color: '#2f9e44', fontSize: 12, letterSpacing: '0.14em' }}
              >
                Day
              </div>
              <div className="font-extrabold" style={{ fontSize: 20, color: '#1f2430' }}>
                {card.day}
              </div>
            </div>
          </div>

          {/* Life skill */}
          <section className="mt-4">
            <div className="relative z-10 flex justify-center">
              <span
                className="poster-pill"
                style={{ backgroundImage: 'linear-gradient(180deg,#f7b32b,#ee9c07)', fontSize: 13 }}
              >
                <span style={{ color: '#fff3c4' }}>★</span>
                Today&apos;s Life Skill
                <span style={{ color: '#fff3c4' }}>★</span>
              </span>
            </div>
            <div
              className="poster-panel px-4 pb-4 pt-6 text-center"
              style={{ backgroundColor: '#fffbea', borderColor: '#f2c766', marginTop: -14 }}
            >
              <p
                className="font-extrabold"
                style={{ fontSize: skillSize, lineHeight: 1.35, color: '#1f2430' }}
              >
                {card.lifeSkill}
              </p>
            </div>
          </section>

          {/* Word of the day */}
          <section className="mt-4">
            <div className="relative z-10 flex justify-center">
              <span
                className="poster-pill"
                style={{ backgroundImage: 'linear-gradient(180deg,#2b86e0,#1667c0)', fontSize: 13 }}
              >
                Word of the Day
              </span>
            </div>
            <div
              className="poster-panel px-3 pb-3.5 pt-6"
              style={{ backgroundColor: '#e8f2fd', borderColor: '#a7c8ee', marginTop: -14 }}
            >
              <div className="grid" style={{ gridTemplateColumns: '1fr 1.25fr 1fr' }}>
                <div className="px-1.5 text-center">
                  <div
                    className="font-extrabold uppercase"
                    style={{ color: '#1971c2', fontSize: 11, letterSpacing: '0.1em' }}
                  >
                    New Word
                  </div>
                  <div
                    className="font-extrabold"
                    style={{ fontSize: 22, color: '#12304f', lineHeight: 1.2, marginTop: 2 }}
                  >
                    {card.word}
                  </div>
                </div>

                <div
                  className="px-2 text-center"
                  style={{
                    borderLeft: '1.5px dashed #9dc0e8',
                    borderRight: '1.5px dashed #9dc0e8'
                  }}
                >
                  <div
                    className="font-extrabold uppercase"
                    style={{ color: '#1971c2', fontSize: 11, letterSpacing: '0.1em' }}
                  >
                    Meaning
                  </div>
                  <div
                    className="font-bold"
                    style={{ fontSize: meaningSize, color: '#12304f', lineHeight: 1.3, marginTop: 3 }}
                  >
                    {card.meaning}
                  </div>
                </div>

                <div className="px-1.5 text-center">
                  <div
                    className="font-extrabold uppercase"
                    style={{ color: '#1971c2', fontSize: 11, letterSpacing: '0.1em' }}
                  >
                    Synonym
                  </div>
                  <div
                    className="font-extrabold"
                    style={{ fontSize: 22, color: '#12304f', lineHeight: 1.2, marginTop: 2 }}
                  >
                    {card.synonym}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Homework */}
          <section className="mt-4">
            <div className="relative z-10 flex justify-center">
              <span
                className="poster-pill"
                style={{ backgroundImage: 'linear-gradient(180deg,#e23b3b,#c81e1e)', fontSize: 13 }}
              >
                Homework
              </span>
            </div>
            <div
              className="poster-panel px-3 pb-2 pt-5"
              style={{ backgroundColor: '#ffffff', borderColor: '#eeaeae', marginTop: -14 }}
            >
              {items.length === 0 ? (
                <p
                  className="py-4 text-center font-bold"
                  style={{ fontSize: 15, color: '#6b7280' }}
                >
                  No homework today.
                </p>
              ) : (
                items.map((item, index) => {
                  const preset = getPreset(item.subjectKey)
                  const name = item.subjectName || preset.name
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3"
                      style={{
                        paddingTop: metrics.padY,
                        paddingBottom: metrics.padY,
                        borderBottom: index < items.length - 1 ? '1px solid #f0eef0' : 'none'
                      }}
                    >
                      <div
                        className="flex-shrink-0 font-extrabold uppercase"
                        style={{
                          width: 104,
                          color: preset.color,
                          fontSize: metrics.label,
                          letterSpacing: '0.02em',
                          lineHeight: 1.35
                        }}
                      >
                        {name}
                      </div>
                      <div
                        className="flex-1 font-semibold"
                        style={{
                          borderLeft: '1px solid #ecdcdc',
                          paddingLeft: 12,
                          fontSize: metrics.task,
                          lineHeight: 1.35,
                          color: '#1f2430',
                          wordBreak: 'break-word'
                        }}
                      >
                        {stripSubjectPrefix(item.task, name)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>

        <PosterFooter />
      </div>
    )
  }
)
