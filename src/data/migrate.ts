import type {
  Appointment,
  AppData,
  ChecklistItem,
  ChildProfile,
  Contraction,
  Diaper,
  Feeding,
  GrowthEntry,
  JournalEntry,
  KickSession,
  Milestone,
  MomLog,
  NameIdea,
  Photo,
  SleepEntry,
  TimeCapsule,
  VaccineDose,
  VoiceNote,
} from './types'
import { DATA_VERSION, builtInVaccines, emptyData } from './seed'

// ============================================================
// ترقية البيانات والتحقّق منها.
//
// هذا الملف هو حارس البوابة: كل ما يدخل التطبيق من تخزين محلي
// أو من ملف نسخة احتياطية يمرّ من هنا أولًا.
//
// المبدأ: **لا نثق بأي بيانات واردة**. ملف احتياطي معطوب أو مُحرَّر يدويًا
// يجب أن يفقد صفوفه التالفة فقط — لا أن يفجّر الواجهة عند أول render
// بعد أن استبدل كل ذكريات المستخدم.
// ============================================================

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined

const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined)

/** تاريخ نصّي صالح للتحويل — نرفض ما لا يفهمه `new Date` حتى لا نعرض «Invalid Date» */
const date = (v: unknown): string | undefined => {
  const s = str(v)
  if (!s) return undefined
  return Number.isNaN(new Date(s).getTime()) ? undefined : s
}

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  allowed.includes(v as T) ? (v as T) : undefined

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const id = (v: unknown): string => str(v) || newId()

/**
 * ينظّف مجموعة: يُسقط الصفوف التالفة ويحذف المعرّفات المكرّرة.
 *
 * `fallback` يُستخدم فقط حين لا تكون القيمة مصفوفة أصلًا (حقل جديد لم يوجد
 * في نسخة أقدم). مصفوفة فارغة صريحة تبقى فارغة — لأن المستخدم قد يكون
 * حذف كل العناصر عمدًا، ولا يصحّ أن نعيدها له في كل تشغيل.
 */
function clean<T extends { id: string }>(
  value: unknown,
  fallback: T[],
  parse: (row: Record<string, unknown>) => T | null,
): T[] {
  if (!Array.isArray(value)) return fallback
  const out: T[] = []
  const seen = new Set<string>()
  for (const row of value) {
    if (!isObj(row)) continue
    let parsed: T | null = null
    try {
      parsed = parse(row)
    } catch {
      // صفّ تالف بشكل غير متوقّع — نتجاوزه ونُكمل بقية المجموعة
    }
    if (!parsed) continue
    if (seen.has(parsed.id)) continue
    seen.add(parsed.id)
    out.push(parsed)
  }
  return out
}

// ---------- مُحلِّلات المجموعات ----------

function childProfile(v: unknown): ChildProfile {
  const base = emptyData().child
  if (!isObj(v)) return base
  const parents = isObj(v.parents) ? v.parents : {}
  return {
    name: str(v.name) ?? base.name,
    gender: oneOf(v.gender, ['unknown', 'boy', 'girl'] as const) ?? 'unknown',
    lmpDate: date(v.lmpDate) ?? null,
    dueDate: date(v.dueDate) ?? null,
    bornAt: date(v.bornAt) ?? null,
    birthWeightKg: num(v.birthWeightKg),
    birthLengthCm: num(v.birthLengthCm),
    photo: str(v.photo) ?? null,
    parents: {
      momName: str(parents.momName) ?? base.parents.momName,
      dadName: str(parents.dadName) ?? base.parents.dadName,
    },
  }
}

const parentOf = (v: unknown) => oneOf(v, ['mom', 'dad'] as const) ?? 'mom'

const kick = (r: Record<string, unknown>): KickSession | null => {
  const startedAt = date(r.startedAt)
  if (!startedAt) return null
  return {
    id: id(r.id),
    startedAt,
    endedAt: date(r.endedAt) ?? null,
    count: Math.max(0, Math.round(num(r.count) ?? 0)),
  }
}

const contraction = (r: Record<string, unknown>): Contraction | null => {
  const startedAt = date(r.startedAt)
  if (!startedAt) return null
  return { id: id(r.id), startedAt, durationSec: Math.max(0, num(r.durationSec) ?? 0) }
}

const appointment = (r: Record<string, unknown>): Appointment | null => {
  const dateTime = date(r.dateTime)
  if (!dateTime) return null
  return {
    id: id(r.id),
    title: str(r.title) || 'موعد',
    dateTime,
    type: oneOf(r.type, ['checkup', 'ultrasound', 'lab', 'other'] as const) ?? 'other',
    location: str(r.location),
    notes: str(r.notes),
    image: str(r.image) ?? null,
  }
}

const momLog = (r: Record<string, unknown>): MomLog | null => {
  const d = date(r.date)
  if (!d) return null
  return {
    id: id(r.id),
    date: d,
    weightKg: num(r.weightKg),
    mood: oneOf(r.mood, ['great', 'good', 'ok', 'tired', 'unwell'] as const),
    symptoms: strList(r.symptoms),
    note: str(r.note),
  }
}

const photo = (r: Record<string, unknown>): Photo | null => {
  const d = date(r.date)
  const dataUrl = str(r.dataUrl)
  const storagePath = str(r.storagePath)
  const remoteUrl = str(r.remoteUrl)
  // صورة بلا أي مصدر لا يمكن عرضها — نُسقطها بدل أن نعرض مربّعًا مكسورًا
  if (!d || (!dataUrl && !storagePath && !remoteUrl)) return null
  return {
    id: id(r.id),
    dataUrl,
    storagePath,
    remoteUrl,
    caption: str(r.caption),
    date: d,
    author: parentOf(r.author),
    authorUid: str(r.authorUid),
    favorite: bool(r.favorite),
  }
}

const journal = (r: Record<string, unknown>): JournalEntry | null => {
  const d = date(r.date)
  const text = str(r.text)
  if (!d || !text) return null
  return {
    id: id(r.id),
    title: str(r.title),
    text,
    date: d,
    author: parentOf(r.author),
    authorUid: str(r.authorUid),
  }
}

const voice = (r: Record<string, unknown>): VoiceNote | null => {
  const d = date(r.date)
  const src = str(r.dataUrl) ?? str(r.storagePath) ?? str(r.remoteUrl)
  // تسجيل بلا مصدر صوت = صفّ ميّت؛ إسقاطه أنظف من عرض مشغّل لا يعمل
  if (!d || !src) return null
  return {
    id: id(r.id),
    dataUrl: str(r.dataUrl),
    storagePath: str(r.storagePath),
    remoteUrl: str(r.remoteUrl),
    title: str(r.title),
    durationSec: Math.max(0, num(r.durationSec) ?? 0),
    date: d,
    author: parentOf(r.author),
    authorUid: str(r.authorUid),
  }
}

const capsule = (r: Record<string, unknown>): TimeCapsule | null => {
  const openAt = date(r.openAt)
  const message = str(r.message)
  if (!openAt || !message) return null
  return {
    id: id(r.id),
    title: str(r.title) || 'رسالة',
    message,
    author: parentOf(r.author),
    authorUid: str(r.authorUid),
    openAt,
    createdAt: date(r.createdAt) ?? new Date().toISOString(),
    isOpened: bool(r.isOpened) ?? false,
  }
}

const milestone = (r: Record<string, unknown>): Milestone | null => {
  const title = str(r.title)
  if (!title) return null
  return {
    id: id(r.id),
    title,
    emoji: str(r.emoji) ?? '',
    achievedAt: date(r.achievedAt) ?? null,
    builtIn: bool(r.builtIn) ?? false,
    note: str(r.note),
  }
}

const nameIdea = (r: Record<string, unknown>): NameIdea | null => {
  const name = str(r.name)
  if (!name) return null
  const votes = isObj(r.votes) ? r.votes : {}
  return {
    id: id(r.id),
    name,
    gender: oneOf(r.gender, ['unknown', 'boy', 'girl'] as const) ?? 'unknown',
    meaning: str(r.meaning),
    proposedBy: parentOf(r.proposedBy),
    votes: { mom: bool(votes.mom) ?? false, dad: bool(votes.dad) ?? false },
  }
}

const checklistItem = (r: Record<string, unknown>): ChecklistItem | null => {
  const label = str(r.label)
  const list = oneOf(r.list, ['hospital', 'shopping'] as const)
  if (!label || !list) return null
  return {
    id: id(r.id),
    label,
    category: str(r.category) || 'أخرى',
    list,
    done: bool(r.done) ?? false,
    builtIn: bool(r.builtIn) ?? false,
  }
}

const feeding = (r: Record<string, unknown>): Feeding | null => {
  const startedAt = date(r.startedAt)
  if (!startedAt) return null
  return {
    id: id(r.id),
    startedAt,
    kind: oneOf(r.kind, ['breast', 'bottle'] as const) ?? 'bottle',
    durationMin: num(r.durationMin),
    side: oneOf(r.side, ['left', 'right'] as const),
    amountMl: num(r.amountMl),
  }
}

const diaper = (r: Record<string, unknown>): Diaper | null => {
  const time = date(r.time)
  if (!time) return null
  return {
    id: id(r.id),
    time,
    kind: oneOf(r.kind, ['wet', 'dirty', 'both'] as const) ?? 'wet',
  }
}

const sleepEntry = (r: Record<string, unknown>): SleepEntry | null => {
  const startedAt = date(r.startedAt)
  if (!startedAt) return null
  return { id: id(r.id), startedAt, endedAt: date(r.endedAt) ?? null }
}

const growth = (r: Record<string, unknown>): GrowthEntry | null => {
  const d = date(r.date)
  if (!d) return null
  return {
    id: id(r.id),
    date: d,
    weightKg: num(r.weightKg),
    lengthCm: num(r.lengthCm),
    headCm: num(r.headCm),
  }
}

const vaccine = (r: Record<string, unknown>): VaccineDose | null => {
  const name = str(r.name)
  if (!name) return null
  return {
    id: id(r.id),
    name,
    dueMonths: Math.max(0, num(r.dueMonths) ?? 0),
    givenAt: date(r.givenAt) ?? null,
    builtIn: bool(r.builtIn) ?? false,
  }
}

// ---------- الترقية ----------

/**
 * يحوّل أي مُدخل غير موثوق إلى `AppData` صالحة، أو `null` إذا لم يكن
 * الشكل قابلًا للإنقاذ إطلاقًا.
 *
 * ملاحظة مهمة: بيانات من **إصدار أحدث** لم تعد تُرفض. رفضها كان يعني
 * فقدانها عمليًا (يحدث مع PWA حين يخدم Service Worker قديم نسخةً أقدم
 * بعد أن كتبت نسخة أحدث بياناتها). الآن نقرأ ما نفهمه ونتجاهل الباقي،
 * لكن **لا نخفض رقم الإصدار المخزَّن** حتى لا نُتلف بيانات النسخة الأحدث.
 */
export function migrate(parsed: unknown): AppData | null {
  if (!isObj(parsed)) return null
  const raw = parsed
  const storedVersion = num(raw.version)
  // بلا رقم إصدار إطلاقًا = ليس ملفًّا من «طفلنا»
  if (storedVersion === undefined) return null

  const base = emptyData()

  return {
    version: Math.max(DATA_VERSION, storedVersion),
    setupComplete: bool(raw.setupComplete) ?? false,
    familyId: str(raw.familyId) ?? null,
    child: childProfile(raw.child),
    kicks: clean(raw.kicks, base.kicks, kick),
    contractions: clean(raw.contractions, base.contractions, contraction),
    appointments: clean(raw.appointments, base.appointments, appointment),
    momLogs: clean(raw.momLogs, base.momLogs, momLog),
    photos: clean(raw.photos, base.photos, photo),
    journal: clean(raw.journal, base.journal, journal),
    // أُضيفت في الإصدار ٤ — النسخ الأقدم تبدأ بقائمة فارغة
    voices: clean(raw.voices, base.voices, voice),
    capsules: clean(raw.capsules, base.capsules, capsule),
    milestones: clean(raw.milestones, base.milestones, milestone),
    names: clean(raw.names, base.names, nameIdea),
    checklist: clean(raw.checklist, base.checklist, checklistItem),
    feedings: clean(raw.feedings, base.feedings, feeding),
    diapers: clean(raw.diapers, base.diapers, diaper),
    sleep: clean(raw.sleep, base.sleep, sleepEntry),
    growth: clean(raw.growth, base.growth, growth),
    // أُضيفت في الإصدار ٣ — النسخ الأقدم لا تحتوي الحقل أصلًا فتأخذ الجدول
    // الافتراضي، أما من حذفها عمدًا (مصفوفة فارغة) فتبقى فارغة.
    vaccines: clean(raw.vaccines, builtInVaccines(), vaccine),
  }
}
