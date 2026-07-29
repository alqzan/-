// ===== الأنواع الأساسية لتطبيق «طفلنا» =====
// كل الشاشات تتعامل مع هذه الأنواع عبر dataService فقط،
// حتى يسهل استبدال طبقة التخزين المحلية بـ Firebase لاحقًا.

export type Parent = 'mom' | 'dad'
export type Gender = 'unknown' | 'boy' | 'girl'

/** ملف الطفل — المحور الذي يحدّد مرحلة التطبيق */
export interface ChildProfile {
  name: string
  gender: Gender
  /** تاريخ آخر دورة (لحساب أسابيع الحمل) — ISO */
  lmpDate: string | null
  /** موعد الولادة المتوقّع — ISO */
  dueDate: string | null
  /** تاريخ الولادة الفعلي — يبقى null حتى الولادة، وعنده تتحوّل الواجهة لرعاية المولود */
  bornAt: string | null
  birthWeightKg?: number
  birthLengthCm?: number
  photo?: string | null
  parents: {
    momName: string
    dadName: string
  }
}

// ===== مرحلة الحمل =====

export interface KickSession {
  id: string
  startedAt: string
  endedAt: string | null
  count: number
}

export interface Contraction {
  id: string
  startedAt: string
  /** مدة الانقباضة بالثواني */
  durationSec: number
}

export type AppointmentType = 'checkup' | 'ultrasound' | 'lab' | 'other'

export interface Appointment {
  id: string
  title: string
  dateTime: string
  type: AppointmentType
  location?: string
  notes?: string
  /** صورة السونار أو ورقة الفحص (Data URL محلي) */
  image?: string | null
}

export type Mood = 'great' | 'good' | 'ok' | 'tired' | 'unwell'

export interface MomLog {
  id: string
  date: string
  weightKg?: number
  mood?: Mood
  symptoms: string[]
  note?: string
}

// ===== الذكريات =====

export interface Photo {
  id: string
  dataUrl: string
  caption?: string
  date: string
  author: Parent
  /** مميّزة بالقلب — تظهر في «المفضلة» وفي كتاب الذكريات */
  favorite?: boolean
}

export interface JournalEntry {
  id: string
  title?: string
  text: string
  date: string
  author: Parent
}

export interface TimeCapsule {
  id: string
  title: string
  message: string
  author: Parent
  /** التاريخ الذي تُفتح فيه الرسالة — ISO */
  openAt: string
  createdAt: string
  isOpened: boolean
}

export interface Milestone {
  id: string
  title: string
  emoji: string
  /** null = لم تتحقق بعد */
  achievedAt: string | null
  /** معلم افتراضي من التطبيق أم مضاف من الوالدين */
  builtIn: boolean
  /** ذكرى مكتوبة عن اللحظة */
  note?: string
}

// ===== التجهيزات =====

export interface NameIdea {
  id: string
  name: string
  gender: Gender
  meaning?: string
  proposedBy: Parent
  votes: { mom: boolean; dad: boolean }
}

export type ChecklistName = 'hospital' | 'shopping'

export interface ChecklistItem {
  id: string
  label: string
  category: string
  list: ChecklistName
  done: boolean
  builtIn: boolean
}

// ===== رعاية المولود (تُفعّل بعد الولادة — مرحلة لاحقة) =====

export type FeedingKind = 'breast' | 'bottle'
export type BreastSide = 'left' | 'right'

export interface Feeding {
  id: string
  startedAt: string
  kind: FeedingKind
  durationMin?: number
  side?: BreastSide
  amountMl?: number
}

export type DiaperKind = 'wet' | 'dirty' | 'both'

export interface Diaper {
  id: string
  time: string
  kind: DiaperKind
}

export interface SleepEntry {
  id: string
  startedAt: string
  endedAt: string | null
}

export interface GrowthEntry {
  id: string
  date: string
  weightKg?: number
  lengthCm?: number
  headCm?: number
}

/**
 * سجل جرعة تطعيم لطفل معيّن — منفصل عن قالب الجدول الرسمي
 * (انظر VaccineScheduleTemplate في src/data/vaccineSchedule.ts).
 * الحقول name/dueMonths هنا هي نسخة محفوظة وقت الإنشاء (للعرض ولتوافق
 * البيانات القديمة)، أما templateId فهو الرابط الثابت لقالب الجرعة —
 * تحديث القالب لاحقًا لا يغيّر أو يحذف هذا السجل.
 */
export interface VaccineDose {
  id: string
  name: string
  /** العمر المستحق بالأشهر (0 = عند الولادة) */
  dueMonths: number
  /** تاريخ الإعطاء — null = لم تُعطَ بعد */
  givenAt: string | null
  builtIn: boolean
  /** ربط ثابت بجرعة القالب الرسمي (VaccineTemplateEntry.id) — null للجرعات المضافة يدويًا */
  templateId?: string | null
}

// ===== الحاوية الكاملة للبيانات =====

export interface AppData {
  version: number
  setupComplete: boolean
  child: ChildProfile
  kicks: KickSession[]
  contractions: Contraction[]
  appointments: Appointment[]
  momLogs: MomLog[]
  photos: Photo[]
  journal: JournalEntry[]
  capsules: TimeCapsule[]
  milestones: Milestone[]
  names: NameIdea[]
  checklist: ChecklistItem[]
  // رعاية المولود
  feedings: Feeding[]
  diapers: Diaper[]
  sleep: SleepEntry[]
  growth: GrowthEntry[]
  vaccines: VaccineDose[]
}
