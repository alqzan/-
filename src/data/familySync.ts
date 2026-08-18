import { useSyncExternalStore } from 'react'
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { canonicalJSON } from '../lib/canonicalJSON'
import { ensureAnonymousAuth, getFirestoreDb, isFirebaseConfigured } from '../lib/firebase'
import { generateFamilyCode, isValidFamilyCode } from '../lib/familyCode'
import {
  clearSyncedFamilyId,
  mergeSyncedData,
  mergeSyncedSnapshots,
  syncableSnapshot,
  type SyncedFields,
} from './dataService'

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
  /**
   * وصلتنا نسخة العائلة السحابية في هذه الجلسة.
   *
   * **لا يُدفع شيء قبل أن تصير true.** كان الجهاز يدفع نسختَه بمجرد أن
   * يقول «متصل»، أي قبل أن يقرأ ما كتبه الطرف الآخر في غيابه — فيدهسه.
   */
  hydrated: boolean
}

const IDLE_STATE: FamilySyncState = {
  status: 'idle',
  code: null,
  error: null,
  lastSyncedAt: null,
  hydrated: false,
}

let state: FamilySyncState = IDLE_STATE
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

// رقم جيل المستمع: callbacks المتأخرة من مستمع قديم لا يجوز لها أن تعيد
// حالة جهازٍ انتقل إلى رمز عائلة آخر.
let listenerGeneration = 0

// إعادة الاتصال ليست زرًا يدويًا فقط. Firestore قد ينهي onSnapshot نهائيًا
// بعد خطأ شبكة/جلسة، ومن دون إعادة اشتراك يتوقف الجهاز عن رؤية أي تحديثات.
const RECONNECT_BASE_MS = 2_000
const RECONNECT_MAX_MS = 30_000
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0
let reconnectInFlight: Promise<void> | null = null
let networkEventsBound = false

/**
 * آخر محتوى رأيناه — سواء وصل من Firestore أو أرسلناه نحن.
 * يمنع حلقة دفع↔استقبال: تحديث ندفعه يعود إلينا عبر `onSnapshot` فنتجاهله
 * بدل أن ندمجه على أنه تغيير خارجي ونعيد دفعه من جديد إلى ما لا نهاية.
 */
let lastSeenJSON: string | null = null

function familyDoc(code: string) {
  return doc(getFirestoreDb(), 'families', code)
}

/**
 * يُسقط `createdAt`/`updatedAt` من مستند وارد من Firestore.
 *
 * (لا علاقة لهذا بـ`syncMeta` — ذاك دفتر تغييراتنا ويجب أن يصل كاملًا.)
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

function cancelReconnect(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function scheduleReconnect(code: string): void {
  if (state.code !== code || state.status === 'idle' || reconnectTimer !== null) return

  const delay = Math.min(
    RECONNECT_BASE_MS * 2 ** Math.min(reconnectAttempt, 4),
    RECONNECT_MAX_MS,
  )
  reconnectAttempt += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    void reconnectListener(code)
  }, delay)
}

async function reconnectListener(code: string): Promise<void> {
  if (state.code !== code || state.status === 'idle') return
  if (reconnectInFlight) return reconnectInFlight

  reconnectInFlight = (async () => {
    setState({ status: 'connecting', code, error: null, hydrated: false })
    try {
      await ensureAnonymousAuth()
      if (state.code !== code || state.status === 'idle') return
      attachListener(code)
      // إذا وصلت اللقطة فورًا (كما في الاختبار/الذاكرة المحلية) يكون
      // المستمع قد وضع hydrated=true؛ لا نطمسها بكتابة الحالة العامة.
      if (state.code === code && state.status !== 'error') {
        setState({ status: 'connected', code, error: null })
      }
    } catch {
      if (state.code !== code || state.status === 'idle') return
      setState({
        status: 'error',
        code,
        hydrated: false,
        error: 'تعذّر الاتصال بالمزامنة — ستُعاد المحاولة تلقائيًا.',
      })
      scheduleReconnect(code)
    }
  })()

  try {
    await reconnectInFlight
  } finally {
    reconnectInFlight = null
  }
}

function bindNetworkEvents(): void {
  if (networkEventsBound || typeof window === 'undefined') return
  networkEventsBound = true

  window.addEventListener('offline', () => {
    if (!state.code || state.status === 'idle') return
    cancelReconnect()
    setState({
      status: 'error',
      hydrated: false,
      error: 'انقطع الإنترنت — بياناتكم المحلية محفوظة، وستُستأنف المزامنة تلقائيًا.',
    })
  })

  window.addEventListener('online', () => {
    const code = state.code
    if (!code || state.status === 'idle') return
    cancelReconnect()
    reconnectAttempt = 0
    void reconnectListener(code)
  })
}

function attachListener(code: string): void {
  bindNetworkEvents()
  cancelReconnect()
  unsubscribeSnapshot?.()
  const generation = ++listenerGeneration
  unsubscribeSnapshot = onSnapshot(
    familyDoc(code),
    (snap) => {
      if (generation !== listenerGeneration || state.code !== code) return
      if (!snap.exists()) {
        // نسخة من ذاكرة SDK لا من الخادم: «غير موجود» هنا يعني «لم نعرف
        // بعد»، فلا نبني عليه شيئًا ولا نأذن بالدفع
        if (snap.metadata?.fromCache) return
        // المستند غائب فعلًا (حُذف من الخادم): نسختنا هي كل ما بقي —
        // نأذن بالدفع لتُنشأ العائلة من جديد بدل أن تبقى المزامنة معلّقة
        lastSeenJSON = null
        reconnectAttempt = 0
        cancelReconnect()
        setState({ status: 'connected', error: null, hydrated: true })
        return
      }
      reconnectAttempt = 0
      cancelReconnect()
      const remote = stripSyncMeta(snap.data() as Record<string, unknown>)
      const json = canonicalJSON(remote)
      // الإذن بالدفع يُمنح قبل فحص الصدى: حتى لو كان الوارد هو ما دفعناه
      // نحن، فقد صرنا نعرف ما في السحابة — وهذا كل ما ينتظره الجسر
      if (json === lastSeenJSON) {
        setState({ status: 'connected', error: null, hydrated: true })
        return // صدى كتابتنا نحن — ليس تغييرًا خارجيًا
      }
      lastSeenJSON = json
      void mergeSyncedData(remote)
      setState({
        status: 'connected',
        error: null,
        hydrated: true,
        lastSyncedAt: new Date().toISOString(),
      })
    },
    () => {
      if (generation !== listenerGeneration || state.code !== code) return
      setState({
        status: 'error',
        code,
        hydrated: false,
        error: 'تعذّر الاتصال بالمزامنة — ستُعاد المحاولة تلقائيًا.',
      })
      scheduleReconnect(code)
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
  bindNetworkEvents()
  cancelReconnect()
  reconnectAttempt = 0
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
    await setDoc(familyDoc(code), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    lastSeenJSON = canonicalJSON(payload)

    persistCode(code)
    attachListener(code)
    setState({
      status: 'connected',
      code,
      error: null,
      hydrated: true,
      lastSyncedAt: new Date().toISOString(),
    })
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

  bindNetworkEvents()
  cancelReconnect()
  reconnectAttempt = 0
  setState({ status: 'connecting', error: null })
  try {
    await ensureAnonymousAuth()
    const snap = await getDoc(familyDoc(code))
    if (!snap.exists()) {
      // لا إنشاء هنا — رمز خاطئ يعني رسالة واضحة والتوقّف عند ذلك
      setState({ ...IDLE_STATE })
      return { ok: false, error: 'لم نجد عائلة بهذا الرمز. تأكّدوا منه مع الطرف الآخر.' }
    }

    const remote = stripSyncMeta(snap.data() as Record<string, unknown>)
    lastSeenJSON = canonicalJSON(remote)
    await mergeSyncedData(remote)

    persistCode(code)
    attachListener(code)
    setState({
      status: 'connected',
      code,
      error: null,
      hydrated: true,
      lastSyncedAt: new Date().toISOString(),
    })
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
  listenerGeneration += 1
  cancelReconnect()
  reconnectAttempt = 0
  unsubscribeSnapshot?.()
  unsubscribeSnapshot = null
  lastSeenJSON = null
  persistCode(null)
  setState({ ...IDLE_STATE })
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

  bindNetworkEvents()
  setState({ status: 'connecting', code, hydrated: false })
  try {
    await ensureAnonymousAuth()
    attachListener(code)
    // «متصل» هنا تعني «الاستماع قائم» لا «قرأنا السحابة». الإذن بالدفع
    // (`hydrated`) لا يُمنح إلا من المستمع نفسه بعد وصول أول لقطة —
    // وهذا بالضبط ما كان ينقص: جهاز يستأنف المزامنة فيدفع نسخته
    // القديمة خلال ثانية، قبل أن يصله ما كُتب في غيابه، فيمحوه.
    setState({ status: 'connected', code, error: null })
  } catch {
    setState({ status: 'error', code, error: 'تعذّر استئناف المزامنة. البيانات المحلية سليمة.' })
  }
}

/**
 * طابور الدفع.
 *
 * الكتابات تجري واحدة تلو الأخرى لا متوازية: كتابتان متزامنتان قد
 * تصلان الخادم بترتيب معكوس، فتستقرّ في السحابة النسخةُ الأقدم وتبدو
 * كأن تعديلًا «رجع». وحين يكون الجهاز خارج الشبكة لا تُحسم كتابة
 * Firestore أصلًا، فينتظر الطابور — وهذا مطلوب: عند العودة تُكتب أحدث
 * لقطة، لا سيلٌ من اللقطات المتقادمة.
 */
let pushChain: Promise<void> = Promise.resolve()

/** يدفع لقطة الحقول القابلة للمزامنة إلى Firestore — يتجاهل الدفع إن لم يتغيّر شيء منذ آخر مرة */
export function pushToCloud(code: string, snapshot: SyncedFields): Promise<void> {
  pushChain = pushChain.then(() => writeSnapshot(code, snapshot))
  return pushChain
}

async function writeSnapshot(code: string, snapshot: SyncedFields): Promise<void> {
  // قد يكون المستخدم أوقف المزامنة أو انتقل إلى عائلة أخرى بينما كانت
  // دفعة قديمة تنتظر في الطابور. لا نعيد الكتابة إلى العائلة القديمة.
  if (state.code !== code || state.status === 'idle') return

  const json = canonicalJSON(snapshot)
  if (json === lastSeenJSON) return
  try {
    const ref = familyDoc(code)
    let committed = snapshot

    // لا نكتب لقطة الجهاز فوق لقطة وصلت في اللحظة نفسها من الطرف الآخر.
    // المعاملة تقرأ المستند الحالي، تضمّه إلى اللقطة، ثم يعيد Firestore
    // المحاولة تلقائيًا إذا سبقتنا كتابة جهاز آخر بين القراءة والكتابة.
    // هكذا لا يعتمد حفظ التعديل على أن يكون المستمع قد استيقظ في التوقيت
    // الصحيح.
    await runTransaction(getFirestoreDb(), async (transaction) => {
      const current = await transaction.get(ref)
      if (current.exists()) {
        const remote = stripSyncMeta(current.data() as Record<string, unknown>)
        committed = mergeSyncedSnapshots(snapshot, remote)
      }

      const payload = { ...committed, updatedAt: serverTimestamp() }
    // `mergeFields` لا `merge: true`، والفرق ليس تفصيلًا:
    //
    // `merge: true` يدمج الخرائط المتداخلة مفتاحًا مفتاحًا، فمفتاحٌ
    // نحذفه من `syncMeta` لا يغادر المستند السحابي أبدًا. وحينها يعود
    // إلينا صدى أكبر ممّا أرسلنا، فيُقرأ «تغييرًا خارجيًا» فيُدمج
    // ويُدفع… وهي الحلقة نفسها التي تستنزف الحصّة وتُعطّل المزامنة.
    //
    // بقناع الحقول تُستبدل كل حقول لقطتنا استبدالًا كاملًا (ومنها دفتر
    // التغييرات)، ويبقى ما ليس في القناع — `createdAt`، وأي حقل يضيفه
    // إصدار أحدث لا نعرفه بعد — كما هو دون أن نمسّه.
      transaction.set(ref, payload, { mergeFields: Object.keys(payload) })
    })

    // إذا ضمّت المعاملة كتابة الطرف الآخر، ثبّت الاتحاد على هذا الجهاز
    // أيضًا قبل أن نعلن أن ما رأيناه هو آخر نسخة.
    const committedJSON = canonicalJSON(committed)
    if (committedJSON !== json) await mergeSyncedData(committed)
    // التسجيل بعد نجاح الكتابة لا قبلها: كان الفشل يُسجّل المحتوى كأنه
    // «وصل»، فلا يُعاد رفعه أبدًا ويبقى الطرف الآخر على نسخة أقدم بصمت.
    lastSeenJSON = committedJSON
    setState({ error: null, lastSyncedAt: new Date().toISOString() })
  } catch {
    if (state.code !== code) return
    setState({
      status: 'error',
      hydrated: false,
      error: 'تعذّر رفع آخر التحديثات — ستُعاد المحاولة تلقائيًا.',
    })
    scheduleReconnect(code)
  }
}

/** إعادة فورية من بطاقة الإعدادات، مع بقاء الإعادة التلقائية مفعّلة. */
export function retryFamilySync(): void {
  const code = state.code
  if (!code || state.status === 'idle') return
  cancelReconnect()
  reconnectAttempt = 0
  void reconnectListener(code)
}
