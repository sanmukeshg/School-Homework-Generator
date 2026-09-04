import { useEffect, useState } from 'react'
import { BasicDetailsFields } from './BasicDetailsFields'
import { BottomSheet } from './BottomSheet'
import { StepIndicator } from './StepIndicator'
import { formatClassSection } from '../data/academics'
import { useSettings } from '../hooks/useSettings'
import { findCardBySlot } from '../services/homeworkService'
import type { HomeworkCard } from '../types'
import { todayKey } from '../utils/date'

interface NewHomeworkSheetProps {
  open: boolean
  onClose: () => void
  /** Carries step 1 into the editor, which opens on step 2. */
  onContinue: (basics: { classId: string; sectionId: string; date: string }) => void
  /** Opening an existing card instead of starting a duplicate. */
  onOpenExisting: (card: HomeworkCard) => void
}

/**
 * Starting a card, from the dashboard.
 *
 * This is step 1 of the homework flow, raised into a sheet so the first
 * decision of the day is one thumb-tap from Home instead of a screen away. The
 * fields are the same component the editor's step 1 renders, so the two cannot
 * drift.
 *
 * It also does the duplicate check here rather than letting the teacher fill in
 * a whole card first and be told at the end.
 */
export function NewHomeworkSheet({
  open,
  onClose,
  onContinue,
  onOpenExisting
}: NewHomeworkSheetProps) {
  const { settings } = useSettings()
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [date, setDate] = useState(todayKey())
  const [existing, setExisting] = useState<HomeworkCard | null>(null)

  // A fresh sheet every time it opens: yesterday's choice must not be
  // mistaken for today's.
  useEffect(() => {
    if (!open) return
    setClassId('')
    setSectionId('')
    setDate(todayKey())
    setExisting(null)
  }, [open])

  // Look for a card already in this slot as soon as the slot is complete.
  useEffect(() => {
    if (!open || !classId || !sectionId || !date) {
      setExisting(null)
      return
    }
    let cancelled = false
    void findCardBySlot(date, classId, sectionId).then((found) => {
      if (!cancelled) setExisting(found ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [open, classId, sectionId, date])

  const complete = Boolean(classId && sectionId && date)

  return (
    <BottomSheet
      open={open}
      title="New Homework"
      subtitle="Who this card is for, and which day it covers"
      onClose={onClose}
      size="short"
      footer={
        <button
          type="button"
          disabled={!complete || Boolean(existing)}
          onClick={() => onContinue({ classId, sectionId, date })}
          className="btn-primary w-full text-base"
        >
          Continue
        </button>
      }
    >
      {/* The same three steps the editor shows, so the flow reads as one
          journey that happens to start here. */}
      <div className="mb-4 border-b border-line pb-4">
        <StepIndicator steps={['Basic Details', 'Homework', 'Generate']} current={0} />
      </div>

      <BasicDetailsFields
        settings={settings}
        classId={classId}
        sectionId={sectionId}
        date={date}
        onClassChange={setClassId}
        onSectionChange={setSectionId}
        onDateChange={(key) => key && setDate(key)}
        idPrefix="new-hw"
      />

      {existing && (
        <div
          className="mt-4 rounded-2xl border border-danger/50 p-3 text-xs text-danger"
          role="alert"
        >
          <p className="font-semibold leading-relaxed">
            {formatClassSection(settings, existing)} already has a card for {existing.displayDate}.
          </p>
          <button
            type="button"
            onClick={() => onOpenExisting(existing)}
            className="mt-2 min-h-[44px] rounded-lg border border-danger/50 px-3 font-semibold"
          >
            Open that card instead
          </button>
        </div>
      )}

      <p className="mt-4 pb-2 text-[11px] leading-relaxed text-faint">
        You will add the life skill, word of the day and homework on the next step.
      </p>
    </BottomSheet>
  )
}
