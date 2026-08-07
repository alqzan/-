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

// ===== الأدوية والعلاج =====

/** شكل الدواء — يحدّد الأيقونة وصيغة التذكير («خذي حبة» لا «خذي إبرة») */
export type MedicationForm =
  | 'pill'
  | 'capsule'
  | 'suppository'
  | 'injection'
  | 'syrup'
  | 'drops'
  | 'topical'
  | 'other'

/**
 * نمط تكرار الدواء.
 *
 * `everyNDays` هي التي تغطّي «يوم ورا يوم» (`everyDays = 2`)، وتُحسب
 * دائمًا من `startDate` — لا من تاريخ اليوم — كي لا ينزلق الجدول كلما
 * فُتح التطبيق.
 */
export type MedFrequency = 'daily' | 'everyNDays' | 'weekdays' | 'asNeeded'

/** لمن هذا الدواء — الأم أو المولود */
export type MedicationWho = 'mom' | 'baby'

export interface Medication {
  id: string
  name: string
  form: MedicationForm
  /** الجرعة كنصّ حر: «حبة واحدة»، «٥ مل»، «٤٠ ملغم» */
  dose?: string
  frequency: MedFrequency
  /**
   * أوقات الجرعات خلال اليوم بصيغة "HH:MM" (٢٤ ساعة) مرتّبة تصاعديًا.
   * ثلاثة أوقات = ثلاث مرات باليوم. فارغة مع «عند اللزوم».
   */
  times: string[]
  /** مع `everyNDays`: كل كم يوم — ٢ تعني يومًا بعد يوم */
  everyDays?: number
  /** مع `weekdays`: أيام الأسبوع، ٠ = الأحد */
  weekdays?: number[]
  /** أول يوم في الجدول — "yyyy-mm-dd" بالتوقيت المحلي، ومرجع حساب التكرار */
  startDate: string
  /** آخر يوم في الجدول — "yyyy-mm-dd"، أو null لعلاج مفتوح المدة */
  endDate: string | null
  who: MedicationWho
  notes?: string
  /** أُوقف يدويًا: يبقى في السجل ولا يطالب بجرعات جديدة */
  archived: boolean
  createdAt: string
}

/**
 * جرعة مسجّلة.
 *
 * المفتاح المنطقي هو (`medId` + `day` + `time`) — لا تاريخ التسجيل الفعلي.
 * بذلك تبقى جرعة الثامنة صباحًا هي نفسها سواء سُجّلت في وقتها أو متأخرة،
 * ولا تتكرّر حين يضغط الوالدان على الجهازين معًا.
 */
export interface MedDoseLog {
  id: string
  medId: string
  /** اليوم المستحق — "yyyy-mm-dd" بالتوقيت المحلي */
  day: string
  /** وقت الجرعة المجدول "HH:MM" — فارغ في جرعات «عند اللزوم» */
  time: string
  /** لحظة التسجيل الفعلية — ISO */
  takenAt: string
  /** سُجّلت كمتخطّاة بدل مأخوذة — الصدق في المتابعة أنفع من سجلّ مثالي */
  skipped?: boolean
}

// ===== الذكريات =====

export interface Photo {
  id: string
  /** الصورة مضمّنة كـ Data URL — مسار التخزين المحلي */
  dataUrl?: string
  /** مسار الملف في Firebase Storage — يُملأ بعد الربط بدل `dataUrl` */
  storagePath?: string
  /** رابط التنزيل الجاهز للعرض (يُخزَّن مؤقتًا لتفادي طلب لكل صورة) */
  remoteUrl?: string
  caption?: string
  date: string
  author: Parent
  /** معرّف حساب الكاتب بعد ربط Auth — `author` يبقى للعرض ولبيانات ما قبل الربط */
  authorUid?: string
  /** مميّزة بالقلب — تظهر في «المفضلة» وفي كتاب الذكريات */
  favorite?: boolean
}

/**
 * رسالة صوتية للطفل.
 *
 * الصوت أبقى من النص: بعد عشرين سنة سيقرأ الطفل كلماتكم، لكنه هنا
 * **يسمع** أصواتكم كما كانت. لذلك التسجيل مواطن أول في الحكاية لا مرفق.
 */
export interface VoiceNote {
  id: string
  /**
   * مفتاح التسجيل في مخزن الوسائط (IndexedDB) — المسار الاعتيادي.
   * الصوت لا يعيش داخل بيانات التطبيق حتى لا يبتلع حصّة localStorage.
   */
  localKey?: string
  /**
   * التسجيل مضمّنًا كـ Data URL — يُستخدم في ملفات النسخ الاحتياطي،
   * وكبديل حين يتعذّر فتح مخزن الوسائط (تصفّح خاص مثلًا).
   */
  dataUrl?: string
  /** مسار الملف في Firebase Storage — يُملأ بعد الربط بدل `dataUrl` */
  storagePath?: string
  /** رابط التنزيل الجاهز للتشغيل */
  remoteUrl?: string
  title?: string
  /** مدة التسجيل بالثواني */
  durationSec: number
  date: string
  author: Parent
  authorUid?: string
}

export interface JournalEntry {
  id: string
  title?: string
  text: string
  date: string
  author: Parent
  authorUid?: string
}

export interface TimeCapsule {
  id: string
  title: string
  message: string
  author: Parent
  authorUid?: string
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

/** جرعة تطعيم في الجدول الاسترشادي */
export interface VaccineDose {
  id: string
  name: string
  /** العمر المستحق بالأشهر (0 = عند الولادة) */
  dueMonths: number
  /** تاريخ الإعطاء — null = لم تُعطَ بعد */
  givenAt: string | null
  builtIn: boolean
}

// ===== الحاوية الكاملة للبيانات =====

export interface AppData {
  version: number
  setupComplete: boolean
  /**
   * معرّف العائلة المشتركة بين الوالدين — يبقى `null` في التخزين المحلي،
   * ويصبح مفتاح مستند العائلة في Firestore بعد الربط.
   */
  familyId: string | null
  child: ChildProfile
  kicks: KickSession[]
  contractions: Contraction[]
  appointments: Appointment[]
  momLogs: MomLog[]
  medications: Medication[]
  medDoses: MedDoseLog[]
  photos: Photo[]
  journal: JournalEntry[]
  voices: VoiceNote[]
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
