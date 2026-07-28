import { useSyncExternalStore } from 'react'
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
  Milestone,
  MomLog,
  NameIdea,
  Parent,
  Photo,
  SleepEntry,
  TimeCapsule,
  VaccineDose,
} from './types'
import { DATA_VERSION, builtInVaccines, emptyData, seedData } from './seed'

// ============================================================
// طبقة البيانات المجرّدة.
// حاليًا: تخزين محلي (localStorage) مع نمط نشر/اشتراك.
// لاحقًا (مرحلة ٢): يُستبدل التنفيذ الداخلي بـ Firebase Firestore
// دون تغيير أي شاشة — الشاشات تستدعي هذه الدوال فقط.
// ============================================================

const STORAGE_KEY = 'tafalna:v2'

/** الحد التقريبي لمساحة localStorage في أغلب المتصفحات */
export const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024

type StorageStatus = { state: 'saved' | 'error'; message: string | null }
let storageStatus: StorageStatus = { state: 'saved', message: null }
let data: AppData = load()
const listeners = new Set<() => void>()
const storageListeners = new Set<() => void>()

/**
 * ترقية البيانات المخزّنة إلى الإصدار الحالي.
 * الهدف: ألّا يفقد مستخدم قديم ذكرياته عند تحديث التطبيق —
 * الحقول الجديدة تُملأ من القالب الفارغ، والقديمة تبقى كما هي.
 */
function migrate(parsed: unknown): AppData | null {
  if (!parsed || typeof parsed !== 'object') return null
  const raw = parsed as Partial<AppData> & Record<string, unknown>
  if (typeof raw.version !== 'number' || raw.version > DATA_VERSION) return null

  const base = emptyData()
  const list = <T,>(value: unknown, fallback: T[]): T[] =>
    Array.isArray(value) ? (value as T[]) : fallback
  const storedVaccines = list<VaccineDose>(raw.vaccines, [])

  return {
    ...base,
    ...raw,
    version: DATA_VERSION,
    setupComplete: Boolean(raw.setupComplete),
    child: { ...base.child, ...(raw.child ?? {}) },
    kicks: list(raw.kicks, base.kicks),
    contractions: list(raw.contractions, base.contractions),
    appointments: list(raw.appointments, base.appointments),
    momLogs: list(raw.momLogs, base.momLogs),
    photos: list(raw.photos, base.photos),
    journal: list(raw.journal, base.journal),
    capsules: list(raw.capsules, base.capsules),
    milestones: list(raw.milestones, base.milestones),
    names: list(raw.names, base.names),
    checklist: list(raw.checklist, base.checklist),
    feedings: list(raw.feedings, base.feedings),
    diapers: list(raw.diapers, base.diapers),
    sleep: list(raw.sleep, base.sleep),
    growth: list(raw.growth, base.growth),
    // أُضيفت في الإصدار ٣ — النسخ الأقدم لا تحتويها
    vaccines: storedVaccines.length ? storedVaccines : builtInVaccines(),
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const migrated = migrate(JSON.parse(raw))
      if (migrated) return migrated
    }
  } catch {
    // تجاهل الأخطاء ونبدأ ببيانات جديدة
  }
  // أول تشغيل: نكتب البيانات الفارغة مباشرة (بدون المرور بـ save
  // لتفادي الوصول إلى `data` قبل تهيئتها).
  const seeded = emptyData()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  } catch {
    storageStatus = {
      state: 'error',
      message: 'تعذّر تجهيز الحفظ على هذا الجهاز. لا تضف ذكريات قبل حل المشكلة.',
    }
  }
  return seeded
}

/** يحفظ ويُرجع true عند نجاح الكتابة على القرص */
function save(next: AppData): boolean {
  data = next
  let ok = true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    storageStatus = { state: 'saved', message: null }
  } catch {
    ok = false
    storageStatus = {
      state: 'error',
      message: 'لم تُحفظ آخر التغييرات على هذا الجهاز. قد تكون مساحة التخزين ممتلئة.',
    }
  }
  listeners.forEach((l) => l())
  storageListeners.forEach((l) => l())
  return ok
}

/** تعديل جزئي غير قابل للتغيير المباشر */
function mutate(patch: Partial<AppData>): boolean {
  return save({ ...data, ...patch })
}

// ---------- الاشتراك (لـ React) ----------

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): AppData {
  return data
}

/** Hook رئيسي: يرجع كامل البيانات ويعيد التصيير عند أي تغيير */
export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useStorageStatus(): StorageStatus {
  return useSyncExternalStore(
    (listener) => {
      storageListeners.add(listener)
      return () => storageListeners.delete(listener)
    },
    () => storageStatus,
  )
}

// ---------- أدوات ----------

export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const nowISO = () => new Date().toISOString()

/** حجم البيانات المخزّنة بالبايت ونسبتها من الحد التقريبي */
export function storageUsage(): { bytes: number; ratio: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? ''
    // كل حرف في localStorage يُخزَّن بـ UTF-16 (بايتان تقريبًا)
    const bytes = raw.length * 2
    return { bytes, ratio: Math.min(1, bytes / STORAGE_LIMIT_BYTES) }
  } catch {
    return { bytes: 0, ratio: 0 }
  }
}

// ============================================================
// النسخ الاحتياطي — الحماية الأهم لبيانات محفوظة على جهاز واحد
// ============================================================

export function exportSnapshot(): string {
  return JSON.stringify(data, null, 2)
}

/** يستبدل كل البيانات بنسخة احتياطية بعد التحقق منها */
export function importSnapshot(json: string): { ok: boolean; error?: string } {
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
  const saved = save(migrated)
  return saved
    ? { ok: true }
    : { ok: false, error: 'تعذّر حفظ النسخة على هذا الجهاز — المساحة قد تكون ممتلئة.' }
}

// ============================================================
// عمليات على المجموعات
// ============================================================

// --- الطفل / الملف ---
export function updateChild(patch: Partial<ChildProfile>) {
  mutate({ child: { ...data.child, ...patch } })
}

export function completeSetup(child: ChildProfile) {
  mutate({ child, setupComplete: true })
}

// --- ركلات الجنين ---
export function addKickSession(session: KickSession) {
  mutate({ kicks: [session, ...data.kicks] })
}
export function updateKickSession(id: string, patch: Partial<KickSession>) {
  mutate({ kicks: data.kicks.map((k) => (k.id === id ? { ...k, ...patch } : k)) })
}
export function deleteKickSession(id: string) {
  mutate({ kicks: data.kicks.filter((k) => k.id !== id) })
}

// --- الانقباضات ---
export function addContraction(startedAt: string, durationSec: number) {
  const c: Contraction = { id: uid(), startedAt, durationSec }
  mutate({ contractions: [c, ...data.contractions] })
}
export function clearContractions() {
  mutate({ contractions: [] })
}

// --- المواعيد ---
export function addAppointment(a: Omit<Appointment, 'id'>) {
  mutate({ appointments: [{ ...a, id: uid() }, ...data.appointments] })
}
export function updateAppointment(id: string, patch: Partial<Appointment>) {
  mutate({
    appointments: data.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  })
}
export function deleteAppointment(id: string) {
  mutate({ appointments: data.appointments.filter((a) => a.id !== id) })
}

// --- متابعة الأم ---
export function addMomLog(log: Omit<MomLog, 'id'>) {
  mutate({ momLogs: [{ ...log, id: uid() }, ...data.momLogs] })
}
export function deleteMomLog(id: string) {
  mutate({ momLogs: data.momLogs.filter((m) => m.id !== id) })
}

// --- الصور ---
/** يُرجع false إذا امتلأت مساحة الجهاز ولم تُحفظ الصورة */
export function addPhoto(p: Omit<Photo, 'id'>): boolean {
  return mutate({ photos: [{ ...p, id: uid() }, ...data.photos] })
}
export function updatePhoto(id: string, patch: Partial<Omit<Photo, 'id' | 'dataUrl'>>) {
  mutate({ photos: data.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
}
export function togglePhotoFavorite(id: string) {
  mutate({
    photos: data.photos.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)),
  })
}
export function deletePhoto(id: string) {
  mutate({ photos: data.photos.filter((p) => p.id !== id) })
}

// --- اليوميّات ---
export function addJournal(entry: Omit<JournalEntry, 'id'>) {
  mutate({ journal: [{ ...entry, id: uid() }, ...data.journal] })
}
export function updateJournal(id: string, patch: Partial<Omit<JournalEntry, 'id'>>) {
  mutate({ journal: data.journal.map((j) => (j.id === id ? { ...j, ...patch } : j)) })
}
export function deleteJournal(id: string) {
  mutate({ journal: data.journal.filter((j) => j.id !== id) })
}

// --- الكبسولة الزمنية ---
export function addCapsule(c: Omit<TimeCapsule, 'id' | 'createdAt' | 'isOpened'>) {
  const capsule: TimeCapsule = { ...c, id: uid(), createdAt: nowISO(), isOpened: false }
  mutate({ capsules: [capsule, ...data.capsules] })
}
export function updateCapsule(
  id: string,
  patch: Partial<Omit<TimeCapsule, 'id' | 'createdAt'>>,
) {
  mutate({ capsules: data.capsules.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
}
export function openCapsule(id: string) {
  mutate({
    capsules: data.capsules.map((c) => (c.id === id ? { ...c, isOpened: true } : c)),
  })
}
export function deleteCapsule(id: string) {
  mutate({ capsules: data.capsules.filter((c) => c.id !== id) })
}

// --- المعالم ---
export function addMilestone(title: string, emoji: string) {
  const m: Milestone = { id: uid(), title, emoji, achievedAt: null, builtIn: false }
  mutate({ milestones: [...data.milestones, m] })
}
export function toggleMilestone(id: string) {
  mutate({
    milestones: data.milestones.map((m) =>
      m.id === id ? { ...m, achievedAt: m.achievedAt ? null : nowISO() } : m,
    ),
  })
}
export function updateMilestone(id: string, patch: Partial<Omit<Milestone, 'id' | 'builtIn'>>) {
  mutate({
    milestones: data.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  })
}
export function deleteMilestone(id: string) {
  mutate({ milestones: data.milestones.filter((m) => m.id !== id) })
}

// --- الأسماء ---
export function addName(n: Omit<NameIdea, 'id' | 'votes'>) {
  const name: NameIdea = { ...n, id: uid(), votes: { mom: false, dad: false } }
  mutate({ names: [name, ...data.names] })
}
export function toggleNameVote(id: string, parent: Parent) {
  mutate({
    names: data.names.map((n) =>
      n.id === id ? { ...n, votes: { ...n.votes, [parent]: !n.votes[parent] } } : n,
    ),
  })
}
export function deleteName(id: string) {
  mutate({ names: data.names.filter((n) => n.id !== id) })
}

// --- قوائم التجهيز ---
export function toggleChecklistItem(id: string) {
  mutate({
    checklist: data.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
  })
}
export function addChecklistItem(item: Omit<ChecklistItem, 'id' | 'done' | 'builtIn'>) {
  const ci: ChecklistItem = { ...item, id: uid(), done: false, builtIn: false }
  mutate({ checklist: [...data.checklist, ci] })
}
export function deleteChecklistItem(id: string) {
  mutate({ checklist: data.checklist.filter((c) => c.id !== id) })
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
  mutate({ feedings: [entry, ...data.feedings] })
}
export function deleteFeeding(id: string) {
  mutate({ feedings: data.feedings.filter((f) => f.id !== id) })
}

// --- الحفاضات ---
export function addDiaper(kind: DiaperKind, time: string = nowISO()) {
  const entry: Diaper = { id: uid(), kind, time }
  mutate({ diapers: [entry, ...data.diapers] })
}
export function deleteDiaper(id: string) {
  mutate({ diapers: data.diapers.filter((d) => d.id !== id) })
}

// --- النوم ---
export function startSleep(startedAt: string = nowISO()) {
  const entry: SleepEntry = { id: uid(), startedAt, endedAt: null }
  mutate({ sleep: [entry, ...data.sleep] })
}
export function endSleep(id: string, endedAt: string = nowISO()) {
  mutate({ sleep: data.sleep.map((s) => (s.id === id ? { ...s, endedAt } : s)) })
}
export function deleteSleep(id: string) {
  mutate({ sleep: data.sleep.filter((s) => s.id !== id) })
}

// --- النمو ---
export function addGrowth(entry: Omit<GrowthEntry, 'id'>) {
  mutate({ growth: [{ ...entry, id: uid() }, ...data.growth] })
}
export function deleteGrowth(id: string) {
  mutate({ growth: data.growth.filter((g) => g.id !== id) })
}

// --- التطعيمات ---
export function setVaccineGiven(id: string, givenAt: string | null) {
  mutate({
    vaccines: data.vaccines.map((v) => (v.id === id ? { ...v, givenAt } : v)),
  })
}
export function addVaccine(name: string, dueMonths: number) {
  const v: VaccineDose = { id: uid(), name, dueMonths, givenAt: null, builtIn: false }
  mutate({ vaccines: [...data.vaccines, v] })
}
export function deleteVaccine(id: string) {
  mutate({ vaccines: data.vaccines.filter((v) => v.id !== id) })
}

// ============================================================
// إعادة الضبط
// ============================================================

/** يمسح كل شيء ويعود لشاشة البداية — لا رجعة، تسبقه رسالة تأكيد في الواجهة */
export function resetAllData() {
  save(emptyData())
}

/** يملأ التطبيق ببيانات تجريبية لاستعراض الواجهات */
export function loadDemoData() {
  save(seedData())
}
