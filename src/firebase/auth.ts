// ============================================================
// المصادقة والانضمام العائلي.
//
// لا توجد شاشة تسجيل دخول تقليدية على الإطلاق:
// - كل جهاز يسجّل دخولًا مجهولًا (Anonymous Auth) بصمت عند أول تشغيل.
// - المزامنة العائلية تتم عبر «كود عائلة» قصير (٧ محارف) أو رابط يحمله:
//     الوالد الأول ينشئ عائلة فيحصل على كود قابل للمشاركة.
//     الوالد الثاني يُدخل الكود (أو يفتح الرابط) لينضم لنفس العائلة.
// - الكود وحده لا يبقى بابًا دائمًا: بعد الانضمام يُسجَّل الجهاز كعضو
//   دائم (uid) في families/{familyId}/members/{uid}. قواعد الأمان بعدها
//   تتحقق من وجود مستند العضوية هذا لكل قراءة/كتابة — وليس من صحة الكود.
//   الكود نفسه يُخزَّن كهاش (SHA-256) قابل للتدوير ضمن مهلة صلاحية،
//   وقابل لإعادة التوليد من صاحب العائلة (owner) في أي وقت.
// ============================================================

import {
  type User,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth'
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './config'
import { JOIN_CODE_TTL_MS, generateJoinCode, hashJoinCode } from './joinCode'
import {
  SCHEMA_VERSION,
  type FamilyDoc,
  type MemberDoc,
  type Role,
  familyPath,
  memberPath,
} from './schema'

const LOCAL_FAMILY_KEY = 'tafalna:familyId'

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super('Firebase غير مهيّأ — لا توجد متغيرات بيئة VITE_FIREBASE_* مضبوطة بعد.')
  }
}

function requireDb() {
  const db = getFirebaseDb()
  if (!db || !isFirebaseConfigured) throw new FirebaseNotConfiguredError()
  return db
}

/** يسجّل دخولًا مجهولًا إن لم يكن مسجَّلًا مسبقًا، ويُرجع المستخدم الحالي */
export function ensureAnonymousAuth(): Promise<User> {
  const auth = getFirebaseAuth()
  if (!auth) return Promise.reject(new FirebaseNotConfiguredError())

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe()
          resolve(user)
          return
        }
        signInAnonymously(auth)
          .then((cred) => {
            unsubscribe()
            resolve(cred.user)
          })
          .catch((err) => {
            unsubscribe()
            reject(err)
          })
      },
      reject,
    )
  })
}

/** معرّف العائلة المحفوظ لهذا الجهاز (بعد إنشاء/انضمام سابق) */
export function getLocalFamilyId(): string | null {
  try {
    return localStorage.getItem(LOCAL_FAMILY_KEY)
  } catch {
    return null
  }
}

function setLocalFamilyId(familyId: string) {
  try {
    localStorage.setItem(LOCAL_FAMILY_KEY, familyId)
  } catch {
    // ثانوي — لا يمنع نجاح العملية نفسها
  }
}

export function clearLocalFamilyId() {
  try {
    localStorage.removeItem(LOCAL_FAMILY_KEY)
  } catch {
    // تجاهل
  }
}

/** ينشئ عائلة جديدة برئاسة المستخدم الحالي، ويُرجع الكود الصريح (يُعرض مرّة واحدة فقط) */
export async function createFamily(
  familyName: string,
  displayName: string,
): Promise<{ familyId: string; joinCode: string }> {
  const db = requireDb()
  const user = await ensureAnonymousAuth()

  const familyId = crypto.randomUUID()
  const code = generateJoinCode()
  const codeHash = await hashJoinCode(code)
  const now = serverTimestamp()

  const family: FamilyDoc = {
    id: familyId,
    name: familyName || 'عائلتنا',
    ownerUid: user.uid,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    joinCodeHash: codeHash,
    joinCodeExpiresAt: Timestamp.fromMillis(Date.now() + JOIN_CODE_TTL_MS),
    migrationCompletedAt: null,
  }
  await setDoc(doc(db, familyPath(familyId)), family)

  const member: MemberDoc = {
    uid: user.uid,
    role: 'owner',
    displayName: displayName || 'ماما/بابا',
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  }
  await setDoc(doc(db, memberPath(familyId, user.uid)), member)

  setLocalFamilyId(familyId)
  return { familyId, joinCode: code }
}

/**
 * ينضم لعائلة موجودة عبر كودها. الأمان الفعلي يفرضه firestore.rules:
 * لا يُقبل إنشاء مستند العضوية إلا إذا تطابق هاش الكود المُرسَل مع
 * الهاش المخزَّن في مستند العائلة ولم تنتهِ صلاحيته — قراءة مستند
 * العائلة الكامل غير لازمة هنا ولا تمنحها هذه العملية.
 */
export async function joinFamily(
  familyId: string,
  code: string,
  displayName: string,
  role: Role = 'editor',
): Promise<void> {
  const db = requireDb()
  const user = await ensureAnonymousAuth()
  const joinCodeHashUsed = await hashJoinCode(code)
  const now = serverTimestamp()

  const member: MemberDoc & { joinCodeHashUsed: string } = {
    uid: user.uid,
    role,
    displayName: displayName || 'ماما/بابا',
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    joinCodeHashUsed,
  }
  // يفشل بخطأ صلاحيات (permission-denied) إن كان الكود خاطئًا/منتهيًا —
  // الواجهة تلتقط الاستثناء وتعرض رسالة عربية مناسبة.
  await setDoc(doc(db, memberPath(familyId, user.uid)), member)
  setLocalFamilyId(familyId)
}

/** يولّد كودًا جديدًا (يُبطل القديم) — لصاحب العائلة فقط، تفرضه القواعد */
export async function rotateJoinCode(familyId: string): Promise<string> {
  const db = requireDb()
  const code = generateJoinCode()
  const joinCodeHash = await hashJoinCode(code)
  await updateDoc(doc(db, familyPath(familyId)), {
    joinCodeHash,
    joinCodeExpiresAt: Timestamp.fromMillis(Date.now() + JOIN_CODE_TTL_MS),
    updatedAt: serverTimestamp(),
  })
  return code
}

export async function getMyMembership(familyId: string): Promise<MemberDoc | null> {
  const db = requireDb()
  const user = await ensureAnonymousAuth()
  const snap = await getDoc(doc(db, memberPath(familyId, user.uid)))
  return snap.exists() ? (snap.data() as MemberDoc) : null
}

export async function getFamily(familyId: string): Promise<FamilyDoc | null> {
  const db = requireDb()
  const snap = await getDoc(doc(db, familyPath(familyId)))
  return snap.exists() ? (snap.data() as FamilyDoc) : null
}

/** رابط دعوة قابل للمشاركة (يحمل familyId + الكود في الجزء المجزّأ) */
export function buildInviteLink(familyId: string, code: string): string {
  const url = new URL(window.location.origin)
  url.hash = `/join?family=${encodeURIComponent(familyId)}&code=${encodeURIComponent(code)}`
  return url.toString()
}
