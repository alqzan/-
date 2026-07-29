// اختبارات قواعد Storage — تعمل فقط ضد محاكي Firebase المحلي.
// انظر تعليق الرأس في firestore.rules.test.ts لأمر التشغيل.

import { readFileSync } from 'node:fs'
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { ref, uploadBytes } from 'firebase/storage'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let testEnv: RulesTestEnvironment

const FAMILY_ID = 'family-1'
const CHILD_ID = 'child-1'
const MEMBER_UID = 'member-uid'
const OUTSIDER_UID = 'outsider-uid'

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'tafalna-rules-test',
    storage: {
      rules: readFileSync('storage.rules', 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
    firestore: {
      rules: `rules_version = '2'; service cloud.firestore { match /databases/{db}/documents { match /{d=**} { allow read, write: if true; } } }`,
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearStorage()
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `families/${FAMILY_ID}/members/${MEMBER_UID}`), {
      uid: MEMBER_UID,
      role: 'editor',
      createdAt: serverTimestamp(),
    })
  })
})

const smallJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x01, 0x02])

describe('رفع الوسائط', () => {
  it('عضو العائلة يرفع صورة ضمن الحد المسموح', async () => {
    const member = testEnv.authenticatedContext(MEMBER_UID).storage()
    await assertSucceeds(
      uploadBytes(ref(member, `${FAMILY_ID}/${CHILD_ID}/media-1`), smallJpeg, {
        contentType: 'image/jpeg',
      }),
    )
  })

  it('غير العضو لا يستطيع الرفع رغم معرفة المسار', async () => {
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID).storage()
    await assertFails(
      uploadBytes(ref(outsider, `${FAMILY_ID}/${CHILD_ID}/media-2`), smallJpeg, {
        contentType: 'image/jpeg',
      }),
    )
  })

  it('يُرفض ملف بصيغة غير مسموحة', async () => {
    const member = testEnv.authenticatedContext(MEMBER_UID).storage()
    await assertFails(
      uploadBytes(ref(member, `${FAMILY_ID}/${CHILD_ID}/media-3`), smallJpeg, {
        contentType: 'application/pdf',
      }),
    )
  })

  it('يُرفض ملف أكبر من الحد المسموح (٨ ميجابايت)', async () => {
    const member = testEnv.authenticatedContext(MEMBER_UID).storage()
    const big = new Uint8Array(9 * 1024 * 1024)
    await assertFails(
      uploadBytes(ref(member, `${FAMILY_ID}/${CHILD_ID}/media-4`), big, {
        contentType: 'image/jpeg',
      }),
    )
  })
})
