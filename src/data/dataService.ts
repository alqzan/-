import { useSyncExternalStore } from 'react'
import type {
  AppData,
  Appointment,
  ChecklistItem,
  ChildProfile,
  Contraction,
  JournalEntry,
  KickSession,
  Milestone,
  MomLog,
  NameIdea,
  Parent,
  Photo,
  TimeCapsule,
} from './types'
import { emptyData, seedData } from './seed'

// ============================================================
// طبقة البيانات المجرّدة.
// حاليًا: تخزين محلي (localStorage) مع نمط نشر/اشتراك.
// لاحقًا (مرحلة ٢): يُستبدل التنفيذ الداخلي بـ Firebase Firestore
// دون تغيير أي شاشة — الشاشات تستدعي هذه الدوال فقط.
// ============================================================

const STORAGE_KEY = 'tafalna:v2'

type StorageStatus = { state: 'saved' | 'error'; message: string | null }
let storageStatus: StorageStatus = { state: 'saved', message: null }
let data: AppData = load()
const listeners = new Set<() => void>()
const storageListeners = new Set<() => void>()

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      if (parsed && parsed.version === 2) return parsed
    }
  } catch {
    // تجاهل الأخطاء ونبدأ ببيانات جديدة
  }
  // أول تشغيل: نكتب البيانات التجريبية مباشرة (بدون المرور بـ save
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

function save(next: AppData) {
  data = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    storageStatus = { state: 'saved', message: null }
  } catch {
    storageStatus = {
      state: 'error',
      message: 'لم تُحفظ آخر التغييرات على هذا الجهاز. قد تكون مساحة التخزين ممتلئة.',
    }
  }
  listeners.forEach((l) => l())
  storageListeners.forEach((l) => l())
}

/** تعديل جزئي غير قابل للتغيير المباشر */
function mutate(patch: Partial<AppData>) {
  save({ ...data, ...patch })
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
export function addPhoto(p: Omit<Photo, 'id'>) {
  mutate({ photos: [{ ...p, id: uid() }, ...data.photos] })
}
export function deletePhoto(id: string) {
  mutate({ photos: data.photos.filter((p) => p.id !== id) })
}

// --- اليوميّات ---
export function addJournal(entry: Omit<JournalEntry, 'id'>) {
  mutate({ journal: [{ ...entry, id: uid() }, ...data.journal] })
}
export function deleteJournal(id: string) {
  mutate({ journal: data.journal.filter((j) => j.id !== id) })
}

// --- الكبسولة الزمنية ---
export function addCapsule(c: Omit<TimeCapsule, 'id' | 'createdAt' | 'isOpened'>) {
  const capsule: TimeCapsule = { ...c, id: uid(), createdAt: nowISO(), isOpened: false }
  mutate({ capsules: [capsule, ...data.capsules] })
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

// --- إعادة الضبط (للتجربة) ---
export function resetAllData() {
  const fresh = seedData()
  save(fresh)
}
