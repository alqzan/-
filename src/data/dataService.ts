import { useEffect, useState, useSyncExternalStore } from 'react'
import type {
  AppData,
  Appointment,
  BreastSide,
  ChecklistItem,
  ChildProfile,
  Contraction,
  Diaper,
  DiaperKind,
  Feeding,
  FeedingKind,
  GrowthEntry,
  JournalEntry,
  KickSession,
  MedDoseLog,
  Medication,
  Milestone,
  MomLog,
  NameIdea,
  Parent,
  Photo,
  SleepEntry,
  SyncMeta,
  TimeCapsule,
  VaccineDose,
  VoiceNote,
} from './types'
import { emptyData, emptySyncMeta, seedData } from './seed'
import { migrate } from './migrate'
import { syncableJSON } from '../lib/canonicalJSON'
import {
  blobToDataUrl,
  dataUrlToBlob,
  deleteAudio,
  getAudio,
  isMediaStoreSupported,
  keepOnly,
  newMediaKey,
  putAudio,
} from './mediaStore'
import {
  LOCAL_STORAGE_LIMIT_BYTES,
  LocalStorageAdapter,
  type StorageAdapter,
  type StorageUsage,
} from './storage'

// ============================================================
// طبقة البيانات.
//
// الشاشات تستدعي هذه الدوال فقط ولا تعرف أين تُحفظ البيانات.
// التبديل إلى Firebase = سطر واحد أدناه (`adapter = new FirestoreAdapter()`)
// بشرط أن يحقّق `StorageAdapter`. راجع FIREBASE.md.
//
// كل عمليات الكتابة **غير متزامنة** وترجع `Promise<boolean>`:
//   true  = وصلت إلى التخزين فعلًا
//   false = فشلت (المساحة ممتلئة، أو رفض الشبكة لاحقًا)
// من لا يهمّه النتيجة يستدعيها بلا await — الواجهة تتحدّث فورًا في الحالتين.
// ============================================================

let adapter: StorageAdapter = new LocalStorageAdapter()

/** يُستدعى مرة واحدة عند الإقلاع — أو من الاختبارات لحقن مخزن بديل */
export function setStorageAdapter(next: StorageAdapter): void {
  adapter = next
}

export const STORAGE_LIMIT_BYTES = LOCAL_STORAGE_LIMIT_BYTES

// ---------- الحالة ----------

export interface DataStatus {
  /** ما زلنا نقرأ التخزين — لا تعرض الواجهة قبل أن تصبح false */
  loading: boolean
  /** رسالة خطأ عربية جاهزة للعرض، أو null */
  error: string | null
  /** true حين تعذّرت قراءة بيانات موجودة — نمنع الكتابة كي لا ندهسها */
  readOnly: boolean
}

let data: AppData = emptyData()
let status: DataStatus = { loading: true, error: null, readOnly: false }

const dataListeners = new Set<() => void>()
const statusListeners = new Set<() => void>()

const notifyData = () => dataListeners.forEach((l) => l())
const notifyStatus = () => statusListeners.forEach((l) => l())

function setStatus(patch: Partial<DataStatus>): void {
  status = { ...status, ...patch }
  notifyStatus()
}

// ---------- الإقلاع ----------

let bootPromise: Promise<void> | null = null

/** يقرأ التخزين ويشغّل الاستماع للتغييرات الخارجية. آمن للاستدعاء أكثر من مرة. */
export function boot(): Promise<void> {
  if (bootPromise) return bootPromise
  bootPromise = (async () => {
    try {
      const result = await adapter.read()
      if (result.status === 'ok') {
        data = result.data
        setStatus({ loading: false, error: null, readOnly: false })
      } else if (result.status === 'empty') {
        // أول تشغيل حقيقي — وهذه الحالة الوحيدة التي يصحّ فيها
        // كتابة بيانات فارغة على التخزين.
        data = emptyData()
        try {
          await adapter.write(data)
          setStatus({ loading: false, error: null, readOnly: false })
        } catch {
          setStatus({
            loading: false,
            readOnly: false,
            error: 'تعذّر تجهيز الحفظ على هذا الجهاز. لا تضيفوا ذكريات قبل حل المشكلة.',
          })
        }
      } else {
        // بيانات موجودة لكن غير مقروءة: نعمل في وضع قراءة فقط حتى
        // لا تدهس جلسةٌ جديدة ما يمكن إنقاذه.
        data = emptyData()
        setStatus({ loading: false, error: result.message, readOnly: true })
      }
    } catch {
      data = emptyData()
      setStatus({
        loading: false,
        readOnly: true,
        error: 'تعذّر الوصول إلى تخزين هذا الجهاز.',
      })
    }
    notifyData()

    adapter.subscribe((external) => {
      // تغيير من تبويب آخر — نتبنّاه بدل أن ندهسه بنسختنا
      data = external
      notifyData()
    })

    // ضمان وصول آخر تعديل إلى القرص قبل إغلاق الصفحة
    window.addEventListener('pagehide', () => void flush())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush()
    })
  })()
  return bootPromise
}

// ---------- الكتابة ----------

/**
 * تأخير بسيط يدمج الكتابات المتتالية في واحدة.
 * السبب: كل كتابة تُسلسل الكائن كاملًا (بما فيه الصور)، فضغطتان
 * متتاليتان كانتا تعنيان تسلسل ميجابايتات مرتين بلا داعٍ.
 */
const WRITE_DEBOUNCE_MS = 250

let writeTimer: ReturnType<typeof setTimeout> | null = null
let waiting: Array<(ok: boolean) => void> = []

async function runWrite(): Promise<void> {
  writeTimer = null
  const resolvers = waiting
  waiting = []
  const snapshot = data
  try {
    await adapter.write(snapshot)
    setStatus({ error: null })
    resolvers.forEach((r) => r(true))
  } catch {
    setStatus({
      error: 'لم تُحفظ آخر التغييرات على هذا الجهاز. قد تكون مساحة التخزين ممتلئة.',
    })
    resolvers.forEach((r) => r(false))
  }
}

/** يكتب أي تعديل مؤجَّل فورًا — يُستدعى قبل إغلاق الصفحة أو قبل التصدير */
export async function flush(): Promise<void> {
  if (writeTimer === null) return
  clearTimeout(writeTimer)
  await runWrite()
}

/**
 * يطبّق تعديلًا على الحالة فورًا ثم يحفظه.
 *
 * وهنا — في المكان الوحيد الذي تمرّ منه كل تعديلات التطبيق — يُختَم
 * التغيير في دفتر المزامنة: ما تغيّر ومتى، وما حُذف ومتى. الشاشات لا
 * تعرف بهذا شيئًا، ولا يمكن أن تنساه.
 */
function commit(patch: Partial<AppData>): Promise<boolean> {
  if (status.readOnly) {
    // بيانات المستخدم الأصلية ما زالت على الجهاز وغير مقروءة — لا نكتب فوقها
    return Promise.resolve(false)
  }
  const next = { ...data, ...patch }
  data = { ...next, syncMeta: stampChanges(data, next) }
  notifyData()
  return new Promise<boolean>((resolve) => {
    waiting.push(resolve)
    if (writeTimer !== null) clearTimeout(writeTimer)
    writeTimer = setTimeout(() => void runWrite(), WRITE_DEBOUNCE_MS)
  })
}

/** استبدال كامل (استعادة نسخة / مسح / بيانات تجريبية) — يتجاوز التأجيل */
async function replaceAll(next: AppData): Promise<boolean> {
  data = next
  notifyData()
  if (writeTimer !== null) {
    clearTimeout(writeTimer)
    writeTimer = null
    waiting.forEach((r) => r(true))
    waiting = []
  }
  try {
    await adapter.write(next)
    setStatus({ error: null, readOnly: false })
    return true
  } catch {
    setStatus({ error: 'تعذّر الحفظ على هذا الجهاز — المساحة قد تكون ممتلئة.' })
    return false
  }
}

// ---------- الاشتراك (لـ React) ----------

function subscribe(listener: () => void): () => void {
  dataListeners.add(listener)
  return () => {
    dataListeners.delete(listener)
  }
}

const getSnapshot = (): AppData => data

/** كامل البيانات — يعيد التصيير عند أي تغيير */
export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/**
 * جزء من البيانات — يعيد التصيير فقط عند تغيّر ذلك الجزء.
 *
 * ⚠️ يجب أن يُرجع المُحدِّد مرجعًا ثابتًا: `(d) => d.photos` صحيح،
 * أما `(d) => d.photos.filter(...)` فيُنشئ مصفوفة جديدة كل مرة
 * ويسبّب حلقة تصيير لا نهائية. رشّح داخل المكوّن بـ `useMemo`.
 */
export function useAppSelector<T>(select: (d: AppData) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(data),
    () => select(data),
  )
}

export function useDataStatus(): DataStatus {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener)
      return () => {
        statusListeners.delete(listener)
      }
    },
    () => status,
    () => status,
  )
}

// ---------- أدوات ----------

export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const nowISO = () => new Date().toISOString()

export function storageUsage(): Promise<StorageUsage> {
  return adapter.usage()
}

export interface UsageView extends StorageUsage {
  /** النسبة من الحد الأقصى (0..1) — صفر حين لا يوجد حد */
  ratio: number
}

/** استهلاك المساحة، يُحدَّث تلقائيًا مع كل تغيير في البيانات */
export function useStorageUsage(): UsageView {
  const snapshot = useAppData()
  const [usage, setUsage] = useState<UsageView>({
    bytes: 0,
    limit: STORAGE_LIMIT_BYTES,
    ratio: 0,
  })

  useEffect(() => {
    let alive = true
    // ننتظر انتهاء الكتابة المؤجَّلة كي يعكس الرقم ما على القرص فعلًا
    void flush()
      .then(() => adapter.usage())
      .then((u) => {
        if (!alive) return
        setUsage({ ...u, ratio: u.limit ? Math.min(1, u.bytes / u.limit) : 0 })
      })
    return () => {
      alive = false
    }
  }, [snapshot])

  return usage
}

// ============================================================
// النسخ الاحتياطي — الحماية الأهم لبيانات محفوظة على جهاز واحد
// ============================================================

/**
 * نسخة فورية ومتزامنة — تُستخدم في شاشة الانهيار حيث لا يصحّ انتظار شيء.
 * لا تتضمّن ملفات الصوت (فهي خارج البيانات في مخزن الوسائط).
 */
export function exportSnapshot(): string {
  return JSON.stringify(data, null, 2)
}

/**
 * النسخة الكاملة: تُضمّن كل تسجيل صوتي داخل الملف كـ Data URL.
 *
 * بدون هذا يكون «النسخ الاحتياطي» كذبة لطيفة: ملف يستعيد كل شيء
 * إلا أصوات الوالدين. الملف يكبر، وهذا ثمن مقبول لضمانة لا تُنقَض.
 */
export async function exportSnapshotWithMedia(): Promise<string> {
  const voices = await Promise.all(
    data.voices.map(async (v) => {
      if (v.dataUrl || !v.localKey) return v
      const blob = await getAudio(v.localKey)
      if (!blob) return v
      try {
        return { ...v, dataUrl: await blobToDataUrl(blob) }
      } catch {
        return v
      }
    }),
  )
  return JSON.stringify({ ...data, voices }, null, 2)
}

/**
 * يُخرج التسجيلات المضمّنة في ملف النسخة إلى مخزن الوسائط.
 * بدونها ترجع الأصوات إلى داخل بيانات التطبيق فتلتهم حصّة التخزين
 * التي هربنا منها أصلًا.
 */
async function hydrateMedia(next: AppData): Promise<AppData> {
  if (!isMediaStoreSupported()) return next
  const voices = await Promise.all(
    next.voices.map(async (v) => {
      if (!v.dataUrl) return v
      try {
        const key = v.localKey ?? newMediaKey()
        await putAudio(key, await dataUrlToBlob(v.dataUrl))
        return { ...v, localKey: key, dataUrl: undefined }
      } catch {
        // تعذّر المخزن: نُبقي التسجيل مضمّنًا بدل أن نفقده
        return v
      }
    }),
  )
  const hydrated = { ...next, voices }
  // تنظيف ما لم يعد مذكورًا في البيانات الجديدة
  await keepOnly(voices.flatMap((v) => (v.localKey ? [v.localKey] : [])))
  return hydrated
}

/** يستبدل كل البيانات بنسخة احتياطية بعد التحقق منها */
export async function importSnapshot(
  json: string,
): Promise<{ ok: boolean; error?: string }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'الملف ليس نسخة احتياطية صالحة (JSON غير سليم).' }
  }
  const migrated = migrate(parsed)
  if (!migrated) {
    return { ok: false, error: 'الملف لا يبدو نسخة احتياطية من «طفلنا».' }
  }
  const saved = await replaceAll(await hydrateMedia(migrated))
  return saved
    ? { ok: true }
    : { ok: false, error: 'تعذّر حفظ النسخة على هذا الجهاز — المساحة قد تكون ممتلئة.' }
}

// ============================================================
// عمليات على المجموعات
// ============================================================

// --- الطفل / الملف ---
export function updateChild(patch: Partial<ChildProfile>) {
  return commit({ child: { ...data.child, ...patch } })
}

export function completeSetup(child: ChildProfile) {
  return commit({ child, setupComplete: true })
}

// --- ركلات الجنين ---
export function addKickSession(session: KickSession) {
  return commit({ kicks: [session, ...data.kicks] })
}
export function updateKickSession(id: string, patch: Partial<KickSession>) {
  return commit({ kicks: data.kicks.map((k) => (k.id === id ? { ...k, ...patch } : k)) })
}
export function deleteKickSession(id: string) {
  return commit({ kicks: data.kicks.filter((k) => k.id !== id) })
}

// --- الانقباضات ---
export function addContraction(startedAt: string, durationSec: number) {
  const c: Contraction = { id: uid(), startedAt, durationSec }
  return commit({ contractions: [c, ...data.contractions] })
}
export function clearContractions() {
  return commit({ contractions: [] })
}

// --- المواعيد ---
export function addAppointment(a: Omit<Appointment, 'id'>) {
  return commit({ appointments: [{ ...a, id: uid() }, ...data.appointments] })
}
export function updateAppointment(id: string, patch: Partial<Appointment>) {
  return commit({
    appointments: data.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  })
}
export function deleteAppointment(id: string) {
  return commit({ appointments: data.appointments.filter((a) => a.id !== id) })
}

// --- متابعة الأم ---
export function addMomLog(log: Omit<MomLog, 'id'>) {
  return commit({ momLogs: [{ ...log, id: uid() }, ...data.momLogs] })
}
export function deleteMomLog(id: string) {
  return commit({ momLogs: data.momLogs.filter((m) => m.id !== id) })
}

// --- الأدوية والعلاج ---

export function addMedication(m: Omit<Medication, 'id' | 'createdAt' | 'archived'>) {
  const med: Medication = { ...m, id: uid(), archived: false, createdAt: nowISO() }
  return commit({ medications: [med, ...data.medications] })
}

export function updateMedication(
  id: string,
  patch: Partial<Omit<Medication, 'id' | 'createdAt'>>,
) {
  return commit({
    medications: data.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  })
}

/** إيقاف العلاج أو استئنافه — بلا حذف، فسجلّ الجرعات السابق جزء من الملف الطبي */
export function setMedicationArchived(id: string, archived: boolean) {
  return updateMedication(id, { archived })
}

/** حذف دواء يحذف سجلّ جرعاته معه — وإلا بقيت سجلّات يتيمة لا تُعرض ولا تُمحى */
export function deleteMedication(id: string) {
  return commit({
    medications: data.medications.filter((m) => m.id !== id),
    medDoses: data.medDoses.filter((d) => d.medId !== id),
  })
}

const doseAt = (medId: string, day: string, time: string) =>
  data.medDoses.find((d) => d.medId === medId && d.day === day && d.time === time)

/**
 * يقلب حالة جرعة مجدولة: غير مسجّلة ← مأخوذة ← غير مسجّلة.
 *
 * المفتاح هو (الدواء + اليوم + الوقت) لا معرّف السجل، فضغطتان متتاليتان
 * لا تُنشئان سجلّين، والضغطة من جهاز الأب تُلغي ما سجّلته الأم لا تكرّره.
 */
export function toggleDose(medId: string, day: string, time: string) {
  const existing = doseAt(medId, day, time)
  if (existing) {
    return commit({ medDoses: data.medDoses.filter((d) => d.id !== existing.id) })
  }
  const log: MedDoseLog = { id: uid(), medId, day, time, takenAt: nowISO() }
  return commit({ medDoses: [log, ...data.medDoses] })
}

/** يسجّل جرعة كمتخطّاة — أو يلغي التخطّي إن كانت مسجّلة كذلك أصلًا */
export function toggleDoseSkipped(medId: string, day: string, time: string) {
  const existing = doseAt(medId, day, time)
  if (existing?.skipped) {
    return commit({ medDoses: data.medDoses.filter((d) => d.id !== existing.id) })
  }
  if (existing) {
    return commit({
      medDoses: data.medDoses.map((d) => (d.id === existing.id ? { ...d, skipped: true } : d)),
    })
  }
  const log: MedDoseLog = { id: uid(), medId, day, time, takenAt: nowISO(), skipped: true }
  return commit({ medDoses: [log, ...data.medDoses] })
}

/**
 * يسجّل جرعة «عند اللزوم» بلحظتها.
 *
 * وقتها المجدول فارغ عمدًا: هذه الجرعة لا موعد لها، ولو أعطيناها وقتًا
 * لصارت الجرعة الثانية في اليوم نفسه تدهس الأولى.
 */
export function logAsNeededDose(medId: string, day: string) {
  const log: MedDoseLog = { id: uid(), medId, day, time: '', takenAt: nowISO() }
  return commit({ medDoses: [log, ...data.medDoses] })
}

export function deleteDose(id: string) {
  return commit({ medDoses: data.medDoses.filter((d) => d.id !== id) })
}

// --- الصور ---
/** يُرجع false إذا امتلأت مساحة الجهاز ولم تُحفظ الصورة */
export function addPhoto(p: Omit<Photo, 'id'>): Promise<boolean> {
  return commit({ photos: [{ ...p, id: uid() }, ...data.photos] })
}
export function updatePhoto(
  id: string,
  patch: Partial<Omit<Photo, 'id' | 'dataUrl' | 'storagePath'>>,
) {
  return commit({ photos: data.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
}
export function togglePhotoFavorite(id: string) {
  return commit({
    photos: data.photos.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)),
  })
}
export function deletePhoto(id: string) {
  return commit({ photos: data.photos.filter((p) => p.id !== id) })
}

// --- اليوميّات ---
export function addJournal(entry: Omit<JournalEntry, 'id'>) {
  return commit({ journal: [{ ...entry, id: uid() }, ...data.journal] })
}
export function updateJournal(id: string, patch: Partial<Omit<JournalEntry, 'id'>>) {
  return commit({ journal: data.journal.map((j) => (j.id === id ? { ...j, ...patch } : j)) })
}
export function deleteJournal(id: string) {
  return commit({ journal: data.journal.filter((j) => j.id !== id) })
}

// --- الرسائل الصوتية ---
/** يُرجع false إذا امتلأت مساحة الجهاز ولم يُحفظ التسجيل */
export function addVoice(v: Omit<VoiceNote, 'id'>): Promise<boolean> {
  return commit({ voices: [{ ...v, id: uid() }, ...data.voices] })
}
export function updateVoice(id: string, patch: Partial<Pick<VoiceNote, 'title'>>) {
  return commit({ voices: data.voices.map((v) => (v.id === id ? { ...v, ...patch } : v)) })
}
export function deleteVoice(id: string) {
  // الملف الصوتي يُحذف من مخزن الوسائط أيضًا، وإلا بقي يشغل المساحة بلا صاحب
  const key = data.voices.find((v) => v.id === id)?.localKey
  if (key) void deleteAudio(key)
  return commit({ voices: data.voices.filter((v) => v.id !== id) })
}

// --- الكبسولة الزمنية ---
export function addCapsule(c: Omit<TimeCapsule, 'id' | 'createdAt' | 'isOpened'>) {
  const capsule: TimeCapsule = { ...c, id: uid(), createdAt: nowISO(), isOpened: false }
  return commit({ capsules: [capsule, ...data.capsules] })
}
export function updateCapsule(
  id: string,
  patch: Partial<Omit<TimeCapsule, 'id' | 'createdAt'>>,
) {
  return commit({ capsules: data.capsules.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
}
export function openCapsule(id: string) {
  return commit({
    capsules: data.capsules.map((c) => (c.id === id ? { ...c, isOpened: true } : c)),
  })
}
export function deleteCapsule(id: string) {
  return commit({ capsules: data.capsules.filter((c) => c.id !== id) })
}

// --- المعالم ---
export function addMilestone(title: string, emoji = '') {
  const m: Milestone = { id: uid(), title, emoji, achievedAt: null, builtIn: false }
  return commit({ milestones: [...data.milestones, m] })
}

/**
 * معلَم وقع فعلًا: يُضاف بتاريخه وذكراه في خطوة واحدة.
 * لوحة «التقاط» توثّق ما حدث للتوّ، فلا معنى لإضافته ثم تعليمه ثم كتابته.
 */
export function addMilestoneAchieved(title: string, achievedAt: string, note?: string) {
  const m: Milestone = { id: uid(), title, emoji: '', achievedAt, builtIn: false, note }
  return commit({ milestones: [...data.milestones, m] })
}
export function toggleMilestone(id: string) {
  return commit({
    milestones: data.milestones.map((m) =>
      m.id === id ? { ...m, achievedAt: m.achievedAt ? null : nowISO() } : m,
    ),
  })
}
export function updateMilestone(
  id: string,
  patch: Partial<Omit<Milestone, 'id' | 'builtIn'>>,
) {
  return commit({
    milestones: data.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  })
}
export function deleteMilestone(id: string) {
  return commit({ milestones: data.milestones.filter((m) => m.id !== id) })
}

// --- الأسماء ---
export function addName(n: Omit<NameIdea, 'id' | 'votes'>) {
  const name: NameIdea = { ...n, id: uid(), votes: { mom: false, dad: false } }
  return commit({ names: [name, ...data.names] })
}
export function toggleNameVote(id: string, parent: Parent) {
  return commit({
    names: data.names.map((n) =>
      n.id === id ? { ...n, votes: { ...n.votes, [parent]: !n.votes[parent] } } : n,
    ),
  })
}
export function deleteName(id: string) {
  return commit({ names: data.names.filter((n) => n.id !== id) })
}

// --- قوائم التجهيز ---
export function toggleChecklistItem(id: string) {
  return commit({
    checklist: data.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
  })
}
export function addChecklistItem(item: Omit<ChecklistItem, 'id' | 'done' | 'builtIn'>) {
  const ci: ChecklistItem = { ...item, id: uid(), done: false, builtIn: false }
  return commit({ checklist: [...data.checklist, ci] })
}
export function deleteChecklistItem(id: string) {
  return commit({ checklist: data.checklist.filter((c) => c.id !== id) })
}

// ============================================================
// رعاية المولود
// ============================================================

// --- الرضاعة ---
export function addFeeding(f: {
  startedAt: string
  kind: FeedingKind
  durationMin?: number
  side?: BreastSide
  amountMl?: number
}) {
  const entry: Feeding = { ...f, id: uid() }
  return commit({ feedings: [entry, ...data.feedings] })
}
export function deleteFeeding(id: string) {
  return commit({ feedings: data.feedings.filter((f) => f.id !== id) })
}

// --- الحفاضات ---
export function addDiaper(kind: DiaperKind, time: string = nowISO()) {
  const entry: Diaper = { id: uid(), kind, time }
  return commit({ diapers: [entry, ...data.diapers] })
}
export function deleteDiaper(id: string) {
  return commit({ diapers: data.diapers.filter((d) => d.id !== id) })
}

// --- النوم ---
export function startSleep(startedAt: string = nowISO()) {
  const entry: SleepEntry = { id: uid(), startedAt, endedAt: null }
  return commit({ sleep: [entry, ...data.sleep] })
}
export function endSleep(id: string, endedAt: string = nowISO()) {
  return commit({ sleep: data.sleep.map((s) => (s.id === id ? { ...s, endedAt } : s)) })
}
export function deleteSleep(id: string) {
  return commit({ sleep: data.sleep.filter((s) => s.id !== id) })
}

// --- النمو ---
export function addGrowth(entry: Omit<GrowthEntry, 'id'>) {
  return commit({ growth: [{ ...entry, id: uid() }, ...data.growth] })
}
export function deleteGrowth(id: string) {
  return commit({ growth: data.growth.filter((g) => g.id !== id) })
}

// --- التطعيمات ---
export function setVaccineGiven(id: string, givenAt: string | null) {
  return commit({
    vaccines: data.vaccines.map((v) => (v.id === id ? { ...v, givenAt } : v)),
  })
}
export function addVaccine(name: string, dueMonths: number) {
  const v: VaccineDose = { id: uid(), name, dueMonths, givenAt: null, builtIn: false }
  return commit({ vaccines: [...data.vaccines, v] })
}
export function deleteVaccine(id: string) {
  return commit({ vaccines: data.vaccines.filter((v) => v.id !== id) })
}

// ============================================================
// مزامنة العائلة — نصوص وسجلّات فقط، بلا صور ولا تسجيلات صوتية
// ============================================================
//
// راجع FIREBASE.md وFAMILY_SYNC.md لمنطق الاتصال والرمز نفسه (في
// `src/data/familySync.ts`). هذا القسم مسؤول فقط عن حدود العقد: أي
// حقول تُرسَل، وكيف يُدمَج ما يصل دون أن تُمحى صورة أو تسجيل محلي.

/** الحقول التي تُرسَل إلى Firestore — لا صور ولا تسجيلات صوتية أبدًا */
export interface SyncedFields {
  familyId: string
  child: ChildProfile
  kicks: KickSession[]
  contractions: Contraction[]
  appointments: Appointment[]
  momLogs: MomLog[]
  medications: Medication[]
  medDoses: MedDoseLog[]
  journal: JournalEntry[]
  capsules: TimeCapsule[]
  milestones: Milestone[]
  names: NameIdea[]
  checklist: ChecklistItem[]
  feedings: Feeding[]
  diapers: Diaper[]
  sleep: SleepEntry[]
  growth: GrowthEntry[]
  vaccines: VaccineDose[]
  /** دفتر التغييرات — بدونه لا يمكن التمييز بين «لم يصلني» و«حُذف» */
  syncMeta: SyncMeta
}

/**
 * المجموعات المُزامَنة، وحقل الوقت الذي تُرتَّب به بعد الدمج.
 *
 * الترتيب هنا ليس تجميلًا: شاشات كثيرة تقرأ `data.kicks[0]` أو تعرض
 * المصفوفة كما هي، فلو خرج الدمج بترتيب عشوائي لظهر «آخر ركلة» ركلةً
 * من الأسبوع الماضي. والأهم أنه يجب أن يكون **واحدًا على الجهازين**:
 * لو رتّب كلٌّ منهما النتيجة بشكل مختلف لاختلف النصّ المدفوع، فظنّ كل
 * جهاز أن الآخر غيّر شيئًا، وتبادلا الدفع بلا نهاية.
 *
 * `null` = مجموعة ترتيبها معنوي لا زمني (قوائم التجهيزات والمعالم
 * والتطعيمات) فتُحفظ بترتيب الوارد ثم يُلحَق بها ما عندنا وحدنا.
 */
const SYNCED_COLLECTIONS = {
  kicks: 'startedAt',
  contractions: 'startedAt',
  appointments: 'dateTime',
  momLogs: 'date',
  medications: 'createdAt',
  medDoses: 'takenAt',
  journal: 'date',
  capsules: 'createdAt',
  milestones: null,
  names: null,
  checklist: null,
  feedings: 'startedAt',
  diapers: 'time',
  sleep: 'startedAt',
  growth: 'date',
  vaccines: null,
} as const

type SyncedCollection = keyof typeof SYNCED_COLLECTIONS

/** أي صفّ في أي مجموعة — الدمج لا يحتاج أن يعرف أكثر من المعرّف */
interface Row {
  id: string
}

/** معرّف ← لحظة (ISO) */
type Stamps = Record<string, string>

const collectionKeys = Object.keys(SYNCED_COLLECTIONS) as SyncedCollection[]

const rowsOf = (source: AppData | SyncedFields, key: SyncedCollection): Row[] | undefined => {
  const value = (source as unknown as Record<string, unknown>)[key]
  return Array.isArray(value) ? (value as Row[]) : undefined
}

/**
 * معرّف صالح لأن يكون مفتاح حقل في Firestore.
 *
 * المفاتيح الفارغة والبادئة بـ `__` محجوزة، وكتابة واحدة منها تُرفض
 * كاملةً. معرّفاتنا لا تكون كذلك، لكن ملف نسخة احتياطية محرَّرًا يدويًا
 * قد يحمل ما يشاء — وعنصر بلا ختم يبقى محفوظًا (الاتحاد يُبقيه)، وهذا
 * أهون بكثير من دفعة مرفوضة تُعطّل المزامنة كلها.
 */
const isStampable = (id: string): boolean => id.length > 0 && !id.startsWith('__')

const byId = (rows: Row[]): Map<string, Row> => new Map(rows.map((r) => [r.id, r]))

/** الأحدث من ختمين — الغياب أقدم من أي لحظة */
const newerStamp = (a: string | undefined, b: string | undefined): string | undefined =>
  a === undefined ? b : b === undefined ? a : a > b ? a : b

/** يدمج دفترَي أختام: لكل معرّف أحدث لحظة سُجّلت له على أي من الجهازين */
function mergeStamps(local: Stamps, remote: Stamps): Stamps {
  const out: Stamps = { ...local }
  for (const [id, at] of Object.entries(remote)) {
    const merged = newerStamp(out[id], at)
    if (merged) out[id] = merged
  }
  return out
}

/**
 * سقف عدد شواهد القبور المحفوظة.
 *
 * الشاهدة تبقى ما بقيت الحاجة إلى إبلاغ جهاز لم يستيقظ بعد بالحذف،
 * لكنها لا تكبر بلا حدّ. القصّ **بالعدد لا بالعمر**: القصّ بالعمر يقرأ
 * ساعة الجهاز، وساعتان متباعدتان على جهازين تعنيان أن أحدهما يحذف
 * شاهدةً والآخر يعيدها فورًا من دفتره — تبادل دفع لا ينتهي حتى تتقارب
 * الساعتان. القصّ بالعدد دالّة خالصة من الاتحاد نفسه: يخرج الجهازان
 * بالنتيجة ذاتها دائمًا.
 */
const MAX_TOMBSTONES = 400

function capTombstones(deleted: Stamps): Stamps {
  const entries = Object.entries(deleted)
  if (entries.length <= MAX_TOMBSTONES) return deleted
  entries.sort((a, b) => (a[1] === b[1] ? (a[0] < b[0] ? -1 : 1) : a[1] < b[1] ? 1 : -1))
  return Object.fromEntries(entries.slice(0, MAX_TOMBSTONES))
}

/**
 * يسجّل في دفتر التغييرات أثر تعديل محلي: ما تغيّر ومتى، وما حُذف ومتى.
 *
 * يعمل من **مكان واحد** (`commit`) بمقارنة ما قبل بما بعد، فلا تحتاج أي
 * من دوال التعديل الثلاثين أن تتذكّر شيئًا — ونسيان واحدة منها كان
 * سيعني عنصرًا يعود من القبر عند أول مزامنة.
 */
function stampChanges(prev: AppData, next: AppData): SyncMeta {
  const at = nowISO()
  const rev: Stamps = { ...prev.syncMeta.rev }
  const deleted: Stamps = { ...prev.syncMeta.deleted }

  for (const key of collectionKeys) {
    const before = rowsOf(prev, key) ?? []
    const after = rowsOf(next, key) ?? []
    if (before === after) continue // المرجع نفسه = لم تُمسّ هذه المجموعة
    const gone = byId(before)
    for (const row of after) {
      const old = gone.get(row.id)
      gone.delete(row.id)
      // المرجع نفسه أولًا: دوال التعديل تُنشئ كائنًا جديدًا للصفّ المتغيّر
      // وحده، فالمقارنة النصّية لا تلزم إلا للحالات النادرة
      if (old === row) continue
      if (old && syncableJSON(old) === syncableJSON(row)) continue
      if (!isStampable(row.id)) continue
      rev[row.id] = at
      // عاد بعد حذفه بالمعرّف نفسه (تراجع عن حذف مثلًا) — الشاهدة انتهت مهمّتها
      delete deleted[row.id]
    }
    for (const id of gone.keys()) {
      if (!isStampable(id)) continue
      deleted[id] = at
      delete rev[id]
    }
  }

  const childRev =
    syncableJSON(prev.child) === syncableJSON(next.child) ? prev.syncMeta.childRev : at

  return { rev, deleted: capTombstones(deleted), ...(childRev ? { childRev } : {}) }
}

/**
 * ينزع كل مفتاح قيمته `undefined` قبل مغادرة الجهاز.
 *
 * **هذا ما كان يعطّل المزامنة كلها.** Firestore يرفض الحمولة كاملةً إذا
 * حوت قيمة `undefined` واحدة:
 *
 *   Function setDoc() called with invalid data. Unsupported field value: undefined
 *
 * و`migrate` تُنتج هذه القيم بطبيعتها: كل حقل اختياري غائب يصير مفتاحًا
 * موجودًا قيمته `undefined` (`milestone.note`، `appointment.location`،
 * `child.birthWeightKg`…). حتى تطبيق فارغ تمامًا يحمل ١٢ منها بعد أول
 * إقلاع — بسبب `note` في المعالم الافتراضية العشرة وحدها. فكانت كل دفعة
 * تُرفض قبل أن تلمس الشبكة، والواجهة تقول «متصل» بينما لا يصل شيء أبدًا.
 *
 * `undefined` في JavaScript يعني «لا قيمة»، وهو ما يعنيه غياب المفتاح
 * تمامًا — و`JSON.stringify` يسقطه أصلًا. فالنزع هنا لا يفقد معلومة.
 */
function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutUndefined) as unknown as T
  if (value === null || typeof value !== 'object') return value
  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(source)) {
    if (val !== undefined) out[key] = withoutUndefined(val)
  }
  return out as T
}

/**
 * لقطة من الحقول القابلة للمزامنة فقط.
 *
 * `photos` و`voices` غائبتان عمدًا — لا تُذكَران هنا إطلاقًا فلا تصلان
 * إلى الشبكة بأي شكل. صورة الموعد (`Appointment.image`) وصورة ملف
 * الطفل (`child.photo`) وسيطان ثقيلان كذلك فتُسقَطان قبل الإرسال،
 * وتبقى نسختاهما المحلية كما هي.
 */
export function syncableSnapshot(familyId: string): SyncedFields {
  return withoutUndefined({
    familyId,
    child: { ...data.child, photo: null },
    kicks: data.kicks,
    contractions: data.contractions,
    appointments: data.appointments.map(({ image: _image, ...rest }) => rest),
    momLogs: data.momLogs,
    medications: data.medications,
    medDoses: data.medDoses,
    journal: data.journal,
    capsules: data.capsules,
    milestones: data.milestones,
    names: data.names,
    checklist: data.checklist,
    feedings: data.feedings,
    diapers: data.diapers,
    sleep: data.sleep,
    growth: data.growth,
    vaccines: data.vaccines,
    syncMeta: data.syncMeta,
  })
}

/**
 * دفتر وارد قد يكون غائبًا (جهاز على إصدار أقدم) — الغياب دفتر فارغ.
 *
 * هذا حدّ غير موثوق: ما يصل من الشبكة يُنظَّف كما يُنظَّف ملف نسخة
 * احتياطية. ونُسقط المفاتيح المحجوزة تحديدًا لأن `__proto__` بينها،
 * وإسنادها بمفتاح متغيّر يعبث بسلسلة النماذج لا بالبيانات.
 */
function incomingMeta(meta: SyncMeta | undefined): SyncMeta {
  if (!meta || typeof meta !== 'object') return emptySyncMeta()
  return {
    rev: safeStamps(meta.rev),
    deleted: safeStamps(meta.deleted),
    childRev: typeof meta.childRev === 'string' ? meta.childRev : undefined,
  }
}

function safeStamps(value: unknown): Stamps {
  if (!value || typeof value !== 'object') return {}
  const out: Stamps = {}
  for (const [id, at] of Object.entries(value as Record<string, unknown>)) {
    if (isStampable(id) && typeof at === 'string') out[id] = at
  }
  return out
}

/**
 * يختار بين نسختين لعنصر واحد.
 *
 * الأحدث ختمًا يفوز. وعند تساوي الختمين (أو غيابهما معًا) يُفضّ التعادل
 * بمقارنة النصّ نفسه — لا بتفضيل «المحلي»: تفضيل المحلي يعني أن كل جهاز
 * يختار نسخته، فلا يتفقان أبدًا ويظلّان يتدافعان الكتابة إلى الأبد.
 */
function pickNewer<T>(
  local: T | undefined,
  remote: T | undefined,
  localRev: string | undefined,
  remoteRev: string | undefined,
): T {
  if (!remote) return local as T
  if (!local) return remote
  if (localRev !== remoteRev) return (remoteRev ?? '') > (localRev ?? '') ? remote : local
  return syncableJSON(remote) > syncableJSON(local) ? remote : local
}

/**
 * دمج مجموعة واحدة: **اتحاد بالمعرّف**، لا استبدال للمصفوفة.
 *
 * هذا هو إصلاح العطل الذي حذف بيانات العائلة. كان الوارد يحلّ محلّ
 * المحلي كاملًا، فأي عنصر لم يكن في نسخة الجهاز الآخر يُعدّ محذوفًا —
 * ويكفي أن يفتح أحدهما التطبيق بعد يومين من الانقطاع ليمحو كل ما كُتب
 * في غيابه. الآن: الغياب لا يحذف شيئًا؛ الحذف لا يجري إلا بشاهدة
 * صريحة أحدث من آخر تعديل على العنصر.
 */
function mergeCollection<T extends Row>(
  local: T[],
  remote: T[] | undefined,
  localRev: Stamps,
  remoteRev: Stamps,
  tombstones: Stamps,
  orderBy: string | null,
): T[] {
  // الجهاز الآخر لا يعرف هذه المجموعة أصلًا (إصدار أقدم) — لا رأي له فيها
  if (!remote) return local

  const localById = byId(local) as Map<string, T>
  const remoteById = byId(remote) as Map<string, T>
  const ids = [...remoteById.keys(), ...local.map((r) => r.id).filter((id) => !remoteById.has(id))]

  const out: T[] = []
  for (const id of ids) {
    const chosen = pickNewer(localById.get(id), remoteById.get(id), localRev[id], remoteRev[id])
    const tomb = tombstones[id]
    const rev = newerStamp(localRev[id], remoteRev[id])
    // التعادل يفوز فيه الحذف: قرار صريح أولى من نسخة قد تكون صدى قديمًا
    if (tomb && !(rev && rev > tomb)) continue
    out.push(chosen)
  }

  if (!orderBy) return out
  return out.sort((a, b) => {
    const ta = timeValue(a, orderBy)
    const tb = timeValue(b, orderBy)
    if (ta !== tb) return tb - ta // الأحدث أولًا — ترتيب الإضافة نفسه في كل الشاشات
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

/** لحظة الصفّ بالمللي ثانية — التاريخ التالف يقع في القاع بترتيب ثابت */
function timeValue(row: Row, field: string): number {
  const raw = (row as unknown as Record<string, unknown>)[field]
  const t = typeof raw === 'string' ? new Date(raw).getTime() : NaN
  return Number.isNaN(t) ? 0 : t
}

/**
 * يدمج تحديثًا واردًا من العائلة السحابية في البيانات المحلية.
 *
 * قاعدتان تحكمان كل سطر هنا:
 *   ١. **لا نمسّ الصور ولا التسجيلات الصوتية** — لا وجود لهما في
 *      `remote` أصلًا، وصورة كل موعد وصورة ملف الطفل تُستبقيان محليًّا.
 *   ٢. **لا نفقد كتابةً لم يرها الطرف الآخر بعد.** ما كُتب هنا أثناء
 *      انقطاع الشبكة يبقى، ويُدفع إليه في الجولة التالية.
 */
export function mergeSyncedData(remote: SyncedFields): Promise<boolean> {
  if (status.readOnly) return Promise.resolve(false)

  const localMeta = data.syncMeta
  const remoteMeta = incomingMeta(remote.syncMeta)
  const tombstones = mergeStamps(localMeta.deleted, remoteMeta.deleted)

  const merged: Record<string, Row[]> = {}
  for (const key of collectionKeys) {
    merged[key] = mergeCollection(
      rowsOf(data, key) ?? [],
      rowsOf(remote, key),
      localMeta.rev,
      remoteMeta.rev,
      tombstones,
      SYNCED_COLLECTIONS[key],
    )
  }

  // صورة الموعد محلية بحتة: تُعاد إلى صفّها أيًّا كانت النسخة الفائزة
  const appointments = (merged.appointments as Appointment[]).map((a) => {
    const local = data.appointments.find((x) => x.id === a.id)
    return local?.image ? { ...a, image: local.image } : a
  })

  // ملف الطفل ليس مجموعة: ختم واحد للملف كله، والأحدث يفوز — وصورته
  // المحلية تبقى مهما فاز
  const child: ChildProfile = {
    ...pickNewer(data.child, remote.child, localMeta.childRev, remoteMeta.childRev),
    photo: data.child.photo,
  }

  // الأختام تبقى لما بقي فقط — لا تنمو بعدد ما حُذف يومًا
  const survivors = new Set(Object.values(merged).flatMap((rows) => rows.map((r) => r.id)))
  const rev: Stamps = {}
  for (const [id, at] of Object.entries(mergeStamps(localMeta.rev, remoteMeta.rev))) {
    if (survivors.has(id)) rev[id] = at
  }
  const childRev = newerStamp(localMeta.childRev, remoteMeta.childRev)

  return replaceAll({
    ...data,
    ...(merged as unknown as Pick<AppData, SyncedCollection>),
    familyId: remote.familyId ?? data.familyId,
    child,
    appointments,
    syncMeta: { rev, deleted: capTombstones(tombstones), ...(childRev ? { childRev } : {}) },
  })
}

/** يفصل الجهاز عن العائلة السحابية دون حذف أي بيانات محلية — الصور والتسجيلات والنصوص تبقى كما هي */
export function clearSyncedFamilyId(): Promise<boolean> {
  if (data.familyId === null) return Promise.resolve(true)
  return replaceAll({ ...data, familyId: null })
}

// ============================================================
// إعادة الضبط
// ============================================================

/** يمسح كل شيء ويعود لشاشة البداية — لا رجعة، تسبقه رسالة تأكيد في الواجهة */
export async function resetAllData() {
  // المسح يشمل مخزن الوسائط، وإلا بقيت التسجيلات تشغل المساحة بعد «مسح كل شيء»
  await keepOnly([])
  return replaceAll(emptyData())
}

/** يملأ التطبيق ببيانات تجريبية لاستعراض الواجهات */
export function loadDemoData() {
  return replaceAll(seedData())
}
