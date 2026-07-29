// ============================================================
// اختبارات قواعد Firestore — تعمل فقط ضد محاكي Firebase المحلي
// (لا تُشغَّل ضمن `npm test` العادي، ولا تتصل بأي مشروع حقيقي).
//
// التشغيل (يتطلب Firebase CLI + Java مثبَّتين محليًا):
//   npx firebase emulators:exec --only firestore,storage \
//     "npx vitest run tests/rules --config vitest.rules.config.ts"
//
// أو ابدأ المحاكي يدويًا في نافذة، ثم في أخرى:
//   npx firebase emulators:start --only firestore,storage
//   npx vitest run tests/rules --config vitest.rules.config.ts
//
// لم يُشغَّل هذا الملف في هذه الجلسة (لا يوجد Firebase CLI/JDK متاحين في
// بيئة التنفيذ الحالية) — انظر التقرير النهائي لتفاصيل ما هو غير مُتحقَّق منه.
// ============================================================

import { readFileSync } from 'node:fs'
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let testEnv: RulesTestEnvironment

const FAMILY_ID = 'family-1'
const OWNER_UID = 'owner-uid'
const MEMBER_UID = 'member-uid'
const OUTSIDER_UID = 'outsider-uid'
const JOIN_CODE_HASH = 'a'.repeat(64) // هاش وهمي ثابت للاختبار

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'tafalna-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // بيانات أولية بصلاحيات المشرف (تتجاوز القواعد) لتجهيز حالة الاختبار
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, `families/${FAMILY_ID}`), {
      id: FAMILY_ID,
      name: 'عائلة الاختبار',
      ownerUid: OWNER_UID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      schemaVersion: 1,
      joinCodeHash: JOIN_CODE_HASH,
      joinCodeExpiresAt: null,
      migrationCompletedAt: null,
    })
    await setDoc(doc(db, `families/${FAMILY_ID}/members/${OWNER_UID}`), {
      uid: OWNER_UID,
      role: 'owner',
      displayName: 'الوالد الأول',
      joinedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      schemaVersion: 1,
    })
    await setDoc(doc(db, `families/${FAMILY_ID}/children/child-1`), {
      id: 'child-1',
      familyId: FAMILY_ID,
      childId: 'child-1',
      createdBy: OWNER_UID,
      schemaVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      name: 'طفل الاختبار',
      gender: 'unknown',
      lmpDate: null,
      dueDate: null,
      bornAt: null,
      parents: { momName: 'ماما', dadName: 'بابا' },
    })
  })
})

describe('عضو العائلة', () => {
  it('يقرأ ويكتب بيانات عائلته', async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore()

    await assertSucceeds(getDoc(doc(owner, `families/${FAMILY_ID}`)))
    await assertSucceeds(getDoc(doc(owner, `families/${FAMILY_ID}/children/child-1`)))

    await assertSucceeds(
      setDoc(doc(owner, `families/${FAMILY_ID}/children/child-1/feedings/f1`), {
        id: 'f1',
        familyId: FAMILY_ID,
        childId: 'child-1',
        createdBy: OWNER_UID,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startedAt: new Date().toISOString(),
        kind: 'bottle',
      }),
    )
  })

  it('ينضم للعائلة عبر كود صحيح غير منتهٍ', async () => {
    const joiner = testEnv.authenticatedContext(MEMBER_UID).firestore()
    await assertSucceeds(
      setDoc(doc(joiner, `families/${FAMILY_ID}/members/${MEMBER_UID}`), {
        uid: MEMBER_UID,
        role: 'editor',
        displayName: 'الوالد الثاني',
        joinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: 1,
        joinCodeHashUsed: JOIN_CODE_HASH,
      }),
    )
  })

  it('يُرفض الانضمام بكود خاطئ', async () => {
    const joiner = testEnv.authenticatedContext(MEMBER_UID).firestore()
    await assertFails(
      setDoc(doc(joiner, `families/${FAMILY_ID}/members/${MEMBER_UID}`), {
        uid: MEMBER_UID,
        role: 'editor',
        displayName: 'محاول دخيل',
        joinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: 1,
        joinCodeHashUsed: 'b'.repeat(64),
      }),
    )
  })
})

describe('غير عضو', () => {
  it('يُرفض حتى مع معرفة familyId ومعرّف مستند دقيق', async () => {
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID).firestore()

    await assertFails(getDoc(doc(outsider, `families/${FAMILY_ID}`)))
    await assertFails(getDoc(doc(outsider, `families/${FAMILY_ID}/children/child-1`)))
    await assertFails(
      setDoc(doc(outsider, `families/${FAMILY_ID}/children/child-1/feedings/f2`), {
        id: 'f2',
        familyId: FAMILY_ID,
        childId: 'child-1',
        createdBy: OUTSIDER_UID,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startedAt: new Date().toISOString(),
        kind: 'bottle',
      }),
    )
  })

  it('لا يمكنه تعديل حقول العائلة (owner فقط)', async () => {
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID).firestore()
    await assertFails(
      updateDoc(doc(outsider, `families/${FAMILY_ID}`), { name: 'اسم مزوَّر' }),
    )
  })
})
