/**
 * Proves firestore.rules against the Firestore emulator.
 *
 * Run with `npm run test:rules` (needs Java on PATH — the emulator is a JAR).
 *
 * Two jobs. The first is to show the administrator role actually holds: that a
 * teacher cannot read another teacher's anything, cannot enumerate accounts,
 * cannot see other people's feedback, and above all cannot make themselves an
 * administrator. The second is regression: every teacher-facing rule that
 * existed before the Admin Panel is asserted here unchanged, so adding a role
 * cannot quietly loosen the app that is already live.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const ADMIN = 'admin-uid'
const ADMIN_2 = 'admin-2-uid'
const TEACHER = 'teacher-uid'
const OTHER = 'other-teacher-uid'

let passed = 0
let failed = 0

async function check(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  PASS  ${name}`)
  } catch (error) {
    failed += 1
    console.log(`  FAIL  ${name}`)
    console.log(`        ${error?.message ?? error}`)
  }
}

const env = await initializeTestEnvironment({
  projectId: 'homework-rules-test',
  firestore: {
    rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'),
    host: '127.0.0.1',
    port: 8080
  }
})

/** Seeds documents with rules switched off, so tests start from a real world. */
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, 'admins', ADMIN), {
    uid: ADMIN,
    grantedBy: 'bootstrap',
    grantedAt: new Date()
  })
  await setDoc(doc(db, 'users', TEACHER), { uid: TEACHER, email: 't@example.com' })
  await setDoc(doc(db, 'users', OTHER), { uid: OTHER, email: 'o@example.com' })
  await setDoc(doc(db, 'subscriptions', TEACHER), { uid: TEACHER, plan: 'trial' })
  await setDoc(doc(db, 'users', TEACHER, 'homework', 'card-1'), {
    schemaVersion: 1,
    date: '2026-09-04',
    classId: 'class-3',
    sectionId: 'b',
    items: []
  })
  await setDoc(doc(db, 'feedback', 'fb-teacher'), {
    uid: TEACHER,
    message: 'Please add a dark mode',
    category: 'idea',
    status: 'new',
    adminNote: '',
    createdAt: new Date()
  })
  await setDoc(doc(db, 'feedback', 'fb-other'), {
    uid: OTHER,
    message: 'Something else',
    category: 'problem',
    status: 'new',
    adminNote: '',
    createdAt: new Date()
  })
})

const admin = env.authenticatedContext(ADMIN).firestore()
const teacher = env.authenticatedContext(TEACHER).firestore()
const anon = env.unauthenticatedContext().firestore()

console.log('\nThe admin role')
await check('a teacher can read their own admins/ entry (and finds nothing)', () =>
  assertSucceeds(getDoc(doc(teacher, 'admins', TEACHER)))
)
await check('a teacher CANNOT read somebody else\'s admins/ entry', () =>
  assertFails(getDoc(doc(teacher, 'admins', ADMIN)))
)
await check('a teacher CANNOT make themselves an administrator', () =>
  assertFails(
    setDoc(doc(teacher, 'admins', TEACHER), {
      uid: TEACHER,
      grantedBy: TEACHER,
      grantedAt: serverTimestamp()
    })
  )
)
await check('a teacher CANNOT make anybody else an administrator', () =>
  assertFails(
    setDoc(doc(teacher, 'admins', OTHER), {
      uid: OTHER,
      grantedBy: TEACHER,
      grantedAt: serverTimestamp()
    })
  )
)
await check('a teacher CANNOT list the administrators', () =>
  assertFails(getDocs(collection(teacher, 'admins')))
)
await check('an administrator can list the administrators', () =>
  assertSucceeds(getDocs(collection(admin, 'admins')))
)
await check('an administrator can grant the role to someone else', () =>
  assertSucceeds(
    setDoc(doc(admin, 'admins', ADMIN_2), {
      uid: ADMIN_2,
      grantedBy: ADMIN,
      grantedAt: serverTimestamp()
    })
  )
)
await check('an administrator CANNOT forge grantedBy', () =>
  assertFails(
    setDoc(doc(admin, 'admins', 'someone'), {
      uid: 'someone',
      grantedBy: TEACHER,
      grantedAt: serverTimestamp()
    })
  )
)
await check('an administrator can revoke somebody else', () =>
  assertSucceeds(deleteDoc(doc(admin, 'admins', ADMIN_2)))
)
await check('an administrator CANNOT revoke themselves (no lock-out)', () =>
  assertFails(deleteDoc(doc(admin, 'admins', ADMIN)))
)
await check('an anonymous visitor CANNOT read the admin list', () =>
  assertFails(getDoc(doc(anon, 'admins', ADMIN)))
)

console.log('\nUser management')
await check('an administrator can list every account', () =>
  assertSucceeds(getDocs(collection(admin, 'users')))
)
await check('a teacher CANNOT list accounts', () =>
  assertFails(getDocs(collection(teacher, 'users')))
)
await check('an administrator can read one account', () =>
  assertSucceeds(getDoc(doc(admin, 'users', TEACHER)))
)
await check('a teacher CANNOT read another account', () =>
  assertFails(getDoc(doc(teacher, 'users', OTHER)))
)
await check('an administrator can read subscriptions', () =>
  assertSucceeds(getDocs(collection(admin, 'subscriptions')))
)
await check('a teacher CANNOT list subscriptions', () =>
  assertFails(getDocs(collection(teacher, 'subscriptions')))
)
await check('an administrator CANNOT switch somebody to a paid plan', () =>
  assertFails(updateDoc(doc(admin, 'subscriptions', TEACHER), { plan: 'pro' }))
)
await check('an administrator CANNOT read a teacher\'s homework', () =>
  assertFails(getDoc(doc(admin, 'users', TEACHER, 'homework', 'card-1')))
)

console.log('\nFeedback')
await check('a teacher can submit feedback as themselves', () =>
  assertSucceeds(
    setDoc(doc(teacher, 'feedback', 'fb-new'), {
      uid: TEACHER,
      message: 'A suggestion',
      category: 'idea',
      status: 'new',
      adminNote: '',
      createdAt: serverTimestamp()
    })
  )
)
await check('a teacher CANNOT submit feedback as somebody else', () =>
  assertFails(
    setDoc(doc(teacher, 'feedback', 'fb-forged'), {
      uid: OTHER,
      message: 'Not mine',
      category: 'idea',
      status: 'new',
      adminNote: '',
      createdAt: serverTimestamp()
    })
  )
)
await check('feedback CANNOT be submitted pre-triaged', () =>
  assertFails(
    setDoc(doc(teacher, 'feedback', 'fb-planned'), {
      uid: TEACHER,
      message: 'Do this next',
      category: 'idea',
      status: 'planned',
      adminNote: '',
      createdAt: serverTimestamp()
    })
  )
)
await check('an unknown category is refused', () =>
  assertFails(
    setDoc(doc(teacher, 'feedback', 'fb-bad-cat'), {
      uid: TEACHER,
      message: 'Hello',
      category: 'urgent',
      status: 'new',
      adminNote: '',
      createdAt: serverTimestamp()
    })
  )
)
await check('an empty message is refused', () =>
  assertFails(
    setDoc(doc(teacher, 'feedback', 'fb-empty'), {
      uid: TEACHER,
      message: '',
      category: 'idea',
      status: 'new',
      adminNote: '',
      createdAt: serverTimestamp()
    })
  )
)
await check('a teacher can read back their own feedback', () =>
  assertSucceeds(
    getDocs(query(collection(teacher, 'feedback'), where('uid', '==', TEACHER)))
  )
)
await check('a teacher CANNOT read the whole feedback collection', () =>
  assertFails(getDocs(collection(teacher, 'feedback')))
)
await check('a teacher CANNOT read another teacher\'s feedback', () =>
  assertFails(getDoc(doc(teacher, 'feedback', 'fb-other')))
)
await check('an administrator can read all feedback', () =>
  assertSucceeds(getDocs(collection(admin, 'feedback')))
)
await check('an administrator can move feedback along the pipeline', () =>
  assertSucceeds(
    updateDoc(doc(admin, 'feedback', 'fb-teacher'), {
      status: 'under-review',
      adminNote: 'Looking at this',
      updatedAt: serverTimestamp()
    })
  )
)
await check('an administrator CANNOT rewrite the message', () =>
  assertFails(
    updateDoc(doc(admin, 'feedback', 'fb-teacher'), {
      message: 'Something they never said',
      updatedAt: serverTimestamp()
    })
  )
)
await check('an unknown status is refused', () =>
  assertFails(
    updateDoc(doc(admin, 'feedback', 'fb-teacher'), {
      status: 'wontfix',
      updatedAt: serverTimestamp()
    })
  )
)
await check('a teacher CANNOT triage their own feedback', () =>
  assertFails(
    updateDoc(doc(teacher, 'feedback', 'fb-teacher'), {
      status: 'implemented',
      updatedAt: serverTimestamp()
    })
  )
)
await check('nobody deletes feedback, not even an administrator', () =>
  assertFails(deleteDoc(doc(admin, 'feedback', 'fb-teacher')))
)

console.log('\nRegression — the teacher rules that were already live')
await check('a teacher reads their own profile', () =>
  assertSucceeds(getDoc(doc(teacher, 'users', TEACHER)))
)
await check('a teacher writes their own homework', () =>
  assertSucceeds(
    setDoc(doc(teacher, 'users', TEACHER, 'homework', 'card-2'), {
      schemaVersion: 1,
      date: '2026-09-05',
      classId: 'class-3',
      sectionId: 'b',
      items: [],
      updatedAt: serverTimestamp()
    })
  )
)
await check('a teacher reads their own homework', () =>
  assertSucceeds(getDoc(doc(teacher, 'users', TEACHER, 'homework', 'card-1')))
)
await check('a teacher CANNOT write homework onto another account', () =>
  assertFails(
    setDoc(doc(teacher, 'users', OTHER, 'homework', 'card-x'), {
      schemaVersion: 1,
      date: '2026-09-05',
      classId: 'class-3',
      sectionId: 'b',
      items: [],
      updatedAt: serverTimestamp()
    })
  )
)
await check('homework with a device clock is refused', () =>
  assertFails(
    setDoc(doc(teacher, 'users', TEACHER, 'homework', 'card-3'), {
      schemaVersion: 1,
      date: '2026-09-05',
      classId: 'class-3',
      sectionId: 'b',
      items: [],
      updatedAt: new Date()
    })
  )
)
await check('a teacher writes their own settings', () =>
  assertSucceeds(
    setDoc(doc(teacher, 'users', TEACHER, 'settings', 'school'), {
      schemaVersion: 1,
      schoolName: 'Vidya',
      initials: 'VHS',
      updatedAt: serverTimestamp()
    })
  )
)
await check('a teacher CANNOT read another account\'s settings', () =>
  assertFails(getDoc(doc(teacher, 'users', OTHER, 'settings', 'school')))
)
await check('a fresh account starts its own trial', () => {
  const fresh = env.authenticatedContext('fresh-uid').firestore()
  return assertSucceeds(
    setDoc(doc(fresh, 'subscriptions', 'fresh-uid'), {
      uid: 'fresh-uid',
      plan: 'trial',
      status: 'active',
      trialStartedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      trialEndsAt: null,
      subscriptionStartedAt: null,
      subscriptionEndsAt: null,
      paymentProvider: null,
      paymentCustomerId: null,
      paymentSubscriptionId: null
    })
  )
})
await check('a teacher CANNOT start a trial on another account', () => {
  return assertFails(
    setDoc(doc(teacher, 'subscriptions', OTHER), {
      uid: OTHER,
      plan: 'trial',
      status: 'active',
      trialStartedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      trialEndsAt: null,
      subscriptionStartedAt: null,
      subscriptionEndsAt: null,
      paymentProvider: null,
      paymentCustomerId: null,
      paymentSubscriptionId: null
    })
  )
})
await check('a teacher CANNOT grant themselves a paid plan', () =>
  assertFails(
    setDoc(doc(teacher, 'subscriptions', TEACHER), {
      uid: TEACHER,
      plan: 'pro',
      status: 'active',
      trialStartedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      trialEndsAt: null,
      subscriptionStartedAt: null,
      subscriptionEndsAt: null,
      paymentProvider: null,
      paymentCustomerId: null,
      paymentSubscriptionId: null
    })
  )
)
await check('an anonymous visitor gets nothing', () =>
  assertFails(getDoc(doc(anon, 'users', TEACHER)))
)

await env.cleanup()

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
