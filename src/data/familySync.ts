import { useSyncExternalStore } from 'react'
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { ensureAnonymousAuth, getFirestoreDb, isFirebaseConfigured } from '../lib/firebase'
import { generateFamilyCode, isValidFamilyCode } from '../lib/familyCode'
import { clearSyncedFamilyId, mergeSyncedData, syncableSnapshot, type SyncedFields } from './dataService'

// =============================================================
// مزامنة العائلة بين الأجهزة — محليًّا أولًا (Local-first).
//
// المبدأ الحاكم في هذا الملف كله: **localStorage يبقى النسخة الأساسية
// دائمًا.** Firestore هنا وسيط نقل للنصوص والسجلّات بين جهازي الوالدين
// فقط — لا مصدر حقيقة، ولا يحمل صورة أو تسجيلًا صوتيًا واحدًا. توقّف
// الإنترنت أو حذف الحساب السحابي لا يعني فقدان شيء على الجهاز.
//
// الرمز نفسه (٤٣ حرفًا، `familyCode.ts`) هو معرّف مستند العائلة وسرّ
// الوصول إليه معًا؛ لا حسابات ولا كلمات مرور.
// =============================================================

const SYNC_KEY = 'tafalna:sync:v1'

export type SyncStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface FamilySyncState {
  status: SyncStatus
  code: string | null
  error: string | null
  lastSyncedAt: string | null
}

let state: FamilySyncState = { status: 'idle', code: null, error: null, lastSyncedAt: null }
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function setState(patch: Partial<FamilySyncState>): void {
  state = { ...state, ...patch }
  notify()
}

export function useFamilySyncState(): FamilySyncState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
}

/** يُستخدم خارج React (مثلًا للتحقّق قبل مغادرة الصفحة) */
export function getFamilySyncState(): FamilySyncState {
  return state
}

let unsubscribeSnapshot: Unsubscribe | null = null

/**
 * آخر محتوى رأيناه — سواء وصل من Firestore أو أرسلناه نحن.
 * يمنع حلقة دفع↔استقبال: تحديث ندفعه يعود إلينا عبر `onSnapshot` فنتجاهله
 * بدل أن ندمجه على أنه تغيير خارجي ونعيد دفعه من جديد إلى ما لا نهاية.
 */
let lastSeenJSON: string | null = null

/**
 * تسلسل **مستقلّ عن ترتيب المفاتيح**.
 *
 * `JSON.stringify` يكتب المفاتيح بترتيب إدراجها، وFirestore يعيد حقول
 * المستند بترتيب خاص به لا يطابق ترتيب `syncableSnapshot`. فكانت مقارنة
 * الصدى بالنصّ الخام تفشل **دائمًا** رغم تطابق المحتوى حرفًا بحرف:
 *
 *   ندفع ← يعود الصدى ← يُحسب تغييرًا خارجيًا ← دمج ← تتغيّر البيانات
 *   ← يدفع الجسر من جديد ← يعود الصدى … بلا نهاية
 *
 * حلقةٌ صامتة تكتب وتقرأ من Firestore بلا توقّف حتى تستنفد حصّة الخطة
 * المجانية، وعندها تفشل كل كتابة وتبدو المزامنة «معطّلة» بلا سبب ظاهر.
 * ترتيب المفاتيح ليس معلومة في بياناتنا، فلا يصحّ أن تُبنى عليه مقارنة.
 */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value === null || typeof value !== 'object') return value
  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort()) {
    // undefined يختفي في JSON.stringify أصلًا، وإسقاطه هنا يجعل
    // «الحقل غائب» و«الحقل undefined» متطابقين في المقارنة
    if (source[key] !== undefined) out[key] = sortKeys(source[key])
  }
  return out
}

function familyDoc(code: string) {
  return doc(getFirestoreDb(), 'families', code)
}

/**
 * يُسقط `createdAt`/`updatedAt` من مستند وارد من Firestore.
 *
 * `syncableSnapshot()` لا تحتوي هذين الحقلين إطلاقًا — نضيفهما فقط
 * عند الكتابة (`serverTimestamp()`). بدون إسقاطهما هنا، كل مقارنة مع
 * `lastSeenJSON` (المبني دومًا من لقطة بلا طابع وقت) تفشل حتى لو كان
 * باقي المحتوى مطابقًا تمامًا، فيُعاد الدمج ثم الدفع من جديد إلى ما لا
 * نهاية — حلقة قراءة↔كتابة لا تتوقف.
 */
function stripSyncMeta(remote: Record<string, unknown>): SyncedFields {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = remote
  return rest as unknown as SyncedFields
}

function readPersistedCode(): string | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { familyCode?: unknown }
    return typeof parsed.familyCode === 'string' ? parsed.familyCode : null
  } catch {
    return null
  }
}

function persistCode(code: string | null): void {
  try {
    if (code) localStorage.setItem(SYNC_KEY, JSON.stringify({ familyCode: code }))
    else localStorage.removeItem(SYNC_KEY)
  } catch {
    // تعذّر الحفظ لا يوقف المزامنة الجارية في الجلسة الحالية، لكنها
    // لن تُستأنف تلقائيًا بعد إعادة تحميل الصفحة.
  }
}

function attachListener(code: string): void {
  unsubscribeSnapshot?.()
  unsubscribeSnapshot = onSnapshot(
    familyDoc(code),
    (snap) => {
      if (!snap.exists()) return
      const remote = stripSyncMeta(snap.data() as Record<string, unknown>)
      const json = canonicalJSON(remote)
      if (json === lastSeenJSON) return // صدى كتابتنا نحن — ليس تغييرًا خارجيًا
      lastSeenJSON = json
      void mergeSyncedData(remote)
      setState({ status: 'connected', error: null, lastSyncedAt: new Date().toISOString() })
    },
    () => {
      setState({ status: 'error', error: 'تعذّر الاتصال بالمزامنة — تحقّقوا من الإنترنت.' })
    },
  )
}

const GENERIC_ERROR = 'تعذّر الاتصال بالمزامنة. حاولوا مرة أخرى بعد قليل.'

/** ينشئ عائلة سحابية جديدة برمز عشوائي ويربط هذا الجهاز بها */
export async function createFamilySync(): Promise<{
  ok: boolean
  code?: string
  error?: string
}> {
  if (!isFirebaseConfigured()) {
    return { ok: false, error: 'المزامنة غير مُفعّلة في هذا الإصدار من التطبيق بعد.' }
  }
  setState({ status: 'connecting', error: null })
  try {
    await ensureAnonymousAuth()

    // احتمال تصادم رمز عشوائي بطول ٤٣ حرفًا شبه معدوم، لكن التحقق رخيص
    let code = generateFamilyCode()
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await getDoc(familyDoc(code))
      if (!existing.exists()) break
      code = generateFamilyCode()
    }

    const payload = syncableSnapshot(code)
    lastSeenJSON = canonicalJSON(payload)
    await setDoc(familyDoc(code), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    persistCode(code)
    attachListener(code)
    setState({ status: 'connected', code, error: null, lastSyncedAt: new Date().toISOString() })
    return { ok: true, code }
  } catch {
    setState({ status: 'error', code: null, error: GENERIC_ERROR })
    return { ok: false, error: GENERIC_ERROR }
  }
}

/**
 * يربط هذا الجهاز برمز عائلة موجود مسبقًا.
 *
 * قاعدة صريحة: **لا يُنشئ عائلة جديدة أبدًا** إن كان الرمز غير موجود —
 * تلك مسؤولية `createFamilySync` وحدها.
 */
export async function joinFamilySync(rawCode: string): Promise<{ ok: boolean; error?: string }> {
  const code = rawCode.trim()

  if (!isFirebaseConfigured()) {
    return { ok: false, error: 'المزامنة غير مُفعّلة في هذا الإصدار من التطبيق بعد.' }
  }
  if (!isValidFamilyCode(code)) {
    return { ok: false, error: 'رمز الربط غير صحيح — تأكّدوا من نسخه كاملًا (٤٣ حرفًا).' }
  }

  setState({ status: 'connecting', error: null })
  try {
    await ensureAnonymousAuth()
    const snap = await getDoc(familyDoc(code))
    if (!snap.exists()) {
      // لا إنشاء هنا — رمز خاطئ يعني رسالة واضحة والتوقّف عند ذلك
      setState({ status: 'idle', code: null, error: null })
      return { ok: false, error: 'لم نجد عائلة بهذا الرمز. تأكّدوا منه مع الطرف الآخر.' }
    }

    const remote = stripSyncMeta(snap.data() as Record<string, unknown>)
    lastSeenJSON = canonicalJSON(remote)
    await mergeSyncedData(remote)

    persistCode(code)
    attachListener(code)
    setState({ status: 'connected', code, error: null, lastSyncedAt: new Date().toISOString() })
    return { ok: true }
  } catch {
    setState({ status: 'error', code: null, error: GENERIC_ERROR })
    return { ok: false, error: GENERIC_ERROR }
  }
}

/**
 * يوقف المزامنة على هذا الجهاز فقط.
 *
 * لا حذف لأي شيء: البيانات المحلية (بما فيها الصور والتسجيلات) تبقى
 * كما هي، والعائلة السحابية تبقى موجودة ليعود إليها الجهاز أو غيره لاحقًا.
 */
export function stopFamilySync(): void {
  unsubscribeSnapshot?.()
  unsubscribeSnapshot = null
  lastSeenJSON = null
  persistCode(null)
  setState({ status: 'idle', code: null, error: null, lastSyncedAt: null })
  // فصل رمز العائلة من البيانات المحلية للعرض فقط — لا يمسّ أي مجموعة أخرى
  void clearSyncedFamilyId()
}

let resumed = false

/** يُستدعى مرة واحدة عند الإقلاع لاستئناف مزامنة كانت مفعّلة في جلسة سابقة */
export async function resumeFamilySync(): Promise<void> {
  if (resumed) return
  resumed = true
  const code = readPersistedCode()
  if (!code || !isFirebaseConfigured()) return

  setState({ status: 'connecting', code })
  try {
    await ensureAnonymousAuth()
    attachListener(code)
    setState({ status: 'connected', code, error: null })
  } catch {
    setState({ status: 'error', code, error: 'تعذّر استئناف المزامنة. البيانات المحلية سليمة.' })
  }
}

/** يدفع لقطة الحقول القابلة للمزامنة إلى Firestore — يتجاهل الدفع إن لم يتغيّر شيء منذ آخر مرة */
export async function pushToCloud(code: string, snapshot: SyncedFields): Promise<void> {
  const json = canonicalJSON(snapshot)
  if (json === lastSeenJSON) return
  try {
    await setDoc(familyDoc(code), { ...snapshot, updatedAt: serverTimestamp() }, { merge: true })
    // التسجيل بعد نجاح الكتابة لا قبلها: كان الفشل يُسجّل المحتوى كأنه
    // «وصل»، فلا يُعاد رفعه أبدًا ويبقى الطرف الآخر على نسخة أقدم بصمت.
    lastSeenJSON = json
    setState({ error: null, lastSyncedAt: new Date().toISOString() })
  } catch {
    setState({ error: 'تعذّر رفع آخر التحديثات — ستُعاد المحاولة مع أي تعديل قادم.' })
  }
}
