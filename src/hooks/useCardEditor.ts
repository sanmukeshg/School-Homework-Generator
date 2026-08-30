import { useCallback, useEffect, useState } from 'react'
import {
  clearDraft,
  createEmptyCard,
  createItem,
  findConflict,
  getCard,
  getDraft,
  isMeaningfulDraft,
  saveCard,
  saveDraft
} from '../services/homeworkService'
import { listSubjects, resolveSubject } from '../data/subjects'
import { useDebouncedEffect } from './useDebouncedEffect'
import type { HomeworkCard, HomeworkItem, SchoolSettings } from '../types'
import { dayName, formatDisplayDate, fromDateKey } from '../utils/date'

interface EditorState {
  card: HomeworkCard | null
  loading: boolean
  dirty: boolean
  restoredDraft: boolean
  /** A different card already occupies this date + class + section. */
  conflict: HomeworkCard | null
}

const EMPTY: EditorState = {
  card: null,
  loading: true,
  dirty: false,
  restoredDraft: false,
  conflict: null
}

/**
 * Owns one homework card: loads the saved copy, falls back to a recovered
 * draft, otherwise builds a new card from the school defaults. While the user
 * types it keeps writing a draft (keyed by the card's own id, so one class's
 * work never overwrites another's) so an unexpected close loses nothing.
 */
export function useCardEditor(
  cardId: string,
  dateKey: string,
  settings: SchoolSettings,
  settingsReady: boolean
) {
  const [state, setState] = useState<EditorState>(EMPTY)

  useEffect(() => {
    if (!settingsReady) return
    let cancelled = false

    async function load() {
      const [saved, draft] = await Promise.all([getCard(cardId), getDraft(cardId)])
      if (cancelled) return

      if (draft && isMeaningfulDraft(draft.card, saved)) {
        setState({ ...EMPTY, card: draft.card, loading: false, dirty: true, restoredDraft: true })
        return
      }
      setState({
        ...EMPTY,
        card: saved ?? createEmptyCard(dateKey, settings, cardId),
        loading: false
      })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [cardId, dateKey, settingsReady, settings])

  // Draft autosave — survives an app kill mid-edit.
  useDebouncedEffect(
    () => {
      if (state.card && state.dirty) void saveDraft(state.card)
    },
    [state.card, state.dirty],
    400
  )

  // Warn about a clash as soon as the slot is chosen, not only on save.
  useDebouncedEffect(
    () => {
      const card = state.card
      if (!card || !card.classId || !card.sectionId) {
        setState((current) => (current.conflict ? { ...current, conflict: null } : current))
        return
      }
      void findConflict(card).then((found) => {
        setState((current) =>
          current.card?.id === card.id ? { ...current, conflict: found ?? null } : current
        )
      })
    },
    [state.card?.date, state.card?.classId, state.card?.sectionId, state.card?.id],
    250
  )

  const patch = useCallback((changes: Partial<HomeworkCard>) => {
    setState((current) =>
      current.card
        ? { ...current, card: { ...current.card, ...changes }, dirty: true, restoredDraft: false }
        : current
    )
  }, [])

  const setDate = useCallback(
    (nextKey: string) => {
      const date = fromDateKey(nextKey)
      patch({
        date: nextKey,
        displayDate: formatDisplayDate(date),
        day: dayName(date)
      })
    },
    [patch]
  )

  const updateItem = useCallback((id: string, changes: Partial<HomeworkItem>) => {
    setState((current) => {
      if (!current.card) return current
      const items = current.card.items.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      )
      return { ...current, card: { ...current.card, items }, dirty: true, restoredDraft: false }
    })
  }, [])

  const changeSubject = useCallback(
    (id: string, subjectKey: string) => {
      updateItem(id, { subjectKey, subjectName: resolveSubject(settings, subjectKey).name })
    },
    [updateItem, settings]
  )

  const addItem = useCallback(() => {
    setState((current) => {
      if (!current.card) return current
      const used = current.card.items.map((item) => item.subjectKey)
      const all = listSubjects(settings).map((subject) => subject.id)
      const nextKey = all.find((key) => !used.includes(key)) ?? 'english'
      const items = [...current.card.items, createItem(nextKey, 'Read Chapter and do Q/A.')]
      return { ...current, card: { ...current.card, items }, dirty: true, restoredDraft: false }
    })
  }, [settings])

  const removeItem = useCallback((id: string) => {
    setState((current) => {
      if (!current.card) return current
      const items = current.card.items.filter((item) => item.id !== id)
      return { ...current, card: { ...current.card, items }, dirty: true, restoredDraft: false }
    })
  }, [])

  /** Saves unless another card already holds this date + class + section. */
  const save = useCallback(async (): Promise<
    { ok: true; card: HomeworkCard } | { ok: false; conflict: HomeworkCard }
  > => {
    const card = state.card
    if (!card) throw new Error('Nothing to save')

    const clash = await findConflict(card)
    if (clash) {
      setState((current) => ({ ...current, conflict: clash }))
      return { ok: false, conflict: clash }
    }

    const saved = await saveCard(card)
    setState((current) => ({
      ...current,
      card: saved,
      dirty: false,
      restoredDraft: false,
      conflict: null
    }))
    return { ok: true, card: saved }
  }, [state.card])

  const discardDraft = useCallback(async () => {
    await clearDraft(cardId)
    const saved = await getCard(cardId)
    setState({ ...EMPTY, card: saved ?? createEmptyCard(dateKey, settings, cardId), loading: false })
  }, [cardId, dateKey, settings])

  return {
    ...state,
    patch,
    setDate,
    updateItem,
    changeSubject,
    addItem,
    removeItem,
    save,
    discardDraft
  }
}
