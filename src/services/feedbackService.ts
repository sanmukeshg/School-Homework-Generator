import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData
} from 'firebase/firestore'
import { getDb } from '../firebase/firestore'
import type { User } from '../firebase/auth'

export type FeedbackCategory = 'idea' | 'problem' | 'question' | 'other'

export type FeedbackStatus = 'new' | 'under-review' | 'planned' | 'implemented' | 'dismissed'

export const FEEDBACK_CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'idea', label: 'Idea' },
  { id: 'problem', label: 'Problem' },
  { id: 'question', label: 'Question' },
  { id: 'other', label: 'Other' }
]

export const FEEDBACK_STATUSES: { id: FeedbackStatus; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'under-review', label: 'Under Review' },
  { id: 'planned', label: 'Planned' },
  { id: 'implemented', label: 'Implemented' },
  { id: 'dismissed', label: 'Dismissed' }
]

/** Matches the ceiling the Security Rules enforce. */
export const MAX_FEEDBACK_LENGTH = 2000

export interface FeedbackItem {
  id: string
  uid: string
  email: string | null
  displayName: string | null
  message: string
  category: FeedbackCategory
  status: FeedbackStatus
  adminNote: string
  createdAt: Date | null
  updatedAt: Date | null
}

function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null
}

function fromFirestore(id: string, data: DocumentData): FeedbackItem {
  return {
    id,
    uid: (data.uid as string) ?? '',
    email: (data.email as string) ?? null,
    displayName: (data.displayName as string) ?? null,
    message: (data.message as string) ?? '',
    category: (data.category as FeedbackCategory) ?? 'other',
    status: (data.status as FeedbackStatus) ?? 'new',
    adminNote: (data.adminNote as string) ?? '',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt)
  }
}

/**
 * Files one piece of feedback.
 *
 * The author, the moment it arrived and its opening status are all fixed here
 * and re-checked by the Security Rules: `uid` must be the caller, `createdAt`
 * must be the server's clock, and `status` must be 'new'. A teacher cannot file
 * something as somebody else, backdate it, or submit it pre-triaged.
 *
 * The name and email are copied in so the Admin Panel can show who wrote it
 * without reading every user record alongside the list.
 */
export async function submitFeedback(
  user: User,
  message: string,
  category: FeedbackCategory
): Promise<void> {
  const db = getDb()
  if (!db) throw new Error('Not connected')

  await addDoc(collection(db, 'feedback'), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    message: message.trim().slice(0, MAX_FEEDBACK_LENGTH),
    category,
    status: 'new',
    adminNote: '',
    createdAt: serverTimestamp()
  })
}

/**
 * This teacher's own feedback.
 *
 * Scoped by uid because the rules evaluate every document a query returns: an
 * unscoped read of the collection is refused outright rather than filtered.
 */
export async function listMyFeedback(uid: string): Promise<FeedbackItem[]> {
  const db = getDb()
  if (!db) return []
  const snapshot = await getDocs(
    query(collection(db, 'feedback'), where('uid', '==', uid), limit(50))
  )
  return snapshot.docs
    .map((entry) => fromFirestore(entry.id, entry.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
}

/** Everything anyone has sent. Refused by the rules for a non-administrator. */
export async function listAllFeedback(max = 200): Promise<FeedbackItem[]> {
  const db = getDb()
  if (!db) return []
  const snapshot = await getDocs(
    query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(max))
  )
  return snapshot.docs.map((entry) => fromFirestore(entry.id, entry.data()))
}

/**
 * Moves one item along the pipeline.
 *
 * Only the status and the administrator's note may change; the rules reject a
 * write that touches the message, its author or when it arrived, so the record
 * of what somebody actually said cannot be edited after the fact.
 */
export async function updateFeedback(
  id: string,
  changes: { status: FeedbackStatus; adminNote: string }
): Promise<void> {
  const db = getDb()
  if (!db) throw new Error('Not connected')
  await updateDoc(doc(db, 'feedback', id), {
    status: changes.status,
    adminNote: changes.adminNote.slice(0, MAX_FEEDBACK_LENGTH),
    updatedAt: serverTimestamp()
  })
}
