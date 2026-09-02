import { BrandMark } from '../components/BrandMark'

/**
 * The first thing on screen while the app initialises Firebase and reads its
 * local configuration. It replaces the blank frame that used to sit there, so
 * there is no artificial delay — it lasts exactly as long as start-up does.
 */
export function BootPage() {
  return (
    <div
      className="screen app-safe-top items-center justify-center px-6"
      role="status"
      aria-live="polite"
      aria-label="Starting Homework Generator"
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <BrandMark />

        <p className="mt-10 text-[15px] font-semibold text-ink">Homework Generator</p>

        {/* An indeterminate bar: honest about progress we cannot measure. */}
        <div className="mt-5 h-1 w-32 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="boot-bar h-full w-1/3 rounded-full bg-brand" />
        </div>
      </div>

      <p className="app-safe-bottom pb-6 text-[11px] text-faint">Starting…</p>
    </div>
  )
}
