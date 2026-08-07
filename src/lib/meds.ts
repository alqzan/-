import type { MedDoseLog, Medication } from '../data/types'
import { localDateInputValue } from './localDate'

// =============================================================
// جدول الأدوية — ملف حساب خالص بلا React ولا تخزين.
//
// كل ما تعرضه شاشة الأدوية يُشتقّ من هنا: أي دواء يُستحقّ في أي يوم،
// وكم جرعة بقيت، وأيّها فات وقتها.
//
// قاعدتان تحكمان الملف كله:
//
// ١) **اليوم وحدة القياس، لا اللحظة.** كل شيء يدور حول مفتاح يوم محلي
//    ("yyyy-mm-dd"). جرعة الثامنة صباحًا تخصّ يومها سواء سُجّلت في وقتها
//    أو بعد الظهر، فلا تنزلق إلى اليوم التالي عند منتصف الليل.
//
// ٢) **التكرار يُحسب من يوم البداية لا من اليوم الحالي.** «يوم بعد يوم»
//    محسوبًا من «الآن» يعني جدولًا يتغيّر كلما فُتح التطبيق. محسوبًا من
//    `startDate` يبقى ثابتًا ومطابقًا لما قالته الطبيبة.
// =============================================================

/** مفتاح اليوم المحلي لتاريخ ما — "yyyy-mm-dd" */
export const dayKeyOf = (date: Date = new Date()): string => localDateInputValue(date)

/**
 * فرق الأيام بين مفتاحي يوم — موجب إذا كان `a` بعد `b`.
 *
 * المقارنة تتمّ عند منتصف ليل UTC للطرفين معًا: الفرق بينهما لا يتأثّر
 * بالتوقيت الصيفي، بينما `new Date(local)` كان يعطي ٢٣ أو ٢٥ ساعة في
 * يومي التحويل فيقفز جدول «يوم بعد يوم» يومًا كاملًا.
 */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000)
}

/** يوم مُزاح بعدد أيام عن مفتاح يوم — "yyyy-mm-dd" */
export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
}

/** رقم يوم الأسبوع لمفتاح يوم — ٠ = الأحد */
export function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay()
}

/** هل الدواء ما زال ساريًا في هذا اليوم؟ (بغضّ النظر عن نمط التكرار) */
export function isMedActiveOn(med: Medication, day: string): boolean {
  if (med.archived) return false
  // مقارنة نصّية صالحة تمامًا مع "yyyy-mm-dd" — الترتيب المعجمي هو الزمني
  if (day < med.startDate) return false
  if (med.endDate && day > med.endDate) return false
  return true
}

/** هل تُستحقّ جرعات هذا الدواء في هذا اليوم بالذات؟ */
export function isMedDueOn(med: Medication, day: string): boolean {
  if (!isMedActiveOn(med, day)) return false
  switch (med.frequency) {
    case 'daily':
      return true
    case 'everyNDays': {
      const step = Math.max(1, Math.round(med.everyDays ?? 2))
      return dayDiff(day, med.startDate) % step === 0
    }
    case 'weekdays':
      return (med.weekdays ?? []).includes(weekdayOf(day))
    case 'asNeeded':
      // لا جدول لها — تُسجَّل عند أخذها فقط
      return false
  }
}

/** جرعة واحدة في يوم واحد: الدواء، وقتها المجدول، وهل سُجّلت */
export interface DoseSlot {
  med: Medication
  day: string
  /** "HH:MM" */
  time: string
  /** مفتاح ثابت للعرض — يجمع الدواء واليوم والوقت */
  key: string
  /** السجل إن كانت الجرعة قد سُجّلت (مأخوذة أو متخطّاة) */
  log: MedDoseLog | null
}

const slotKey = (medId: string, day: string, time: string) => `${medId}|${day}|${time}`

/**
 * كل جرعات يوم واحد مرتّبة بالوقت.
 *
 * الترتيب بالوقت أولًا ثم بالاسم: الشاشة تُقرأ كخط زمني للنهار، فما
 * يهمّ الأم هو «ماذا الآن» لا «كم دواءً عندي».
 */
export function dayPlan(meds: Medication[], logs: MedDoseLog[], day: string): DoseSlot[] {
  const byKey = new Map<string, MedDoseLog>()
  for (const log of logs) {
    if (log.day === day) byKey.set(slotKey(log.medId, log.day, log.time), log)
  }

  const slots: DoseSlot[] = []
  for (const med of meds) {
    if (!isMedDueOn(med, day)) continue
    for (const time of med.times) {
      const key = slotKey(med.id, day, time)
      slots.push({ med, day, time, key, log: byKey.get(key) ?? null })
    }
  }
  return slots.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name, 'ar'))
}

/** جرعات «عند اللزوم» المسجّلة في يوم ما، الأحدث أولًا */
export function asNeededLogsOn(
  meds: Medication[],
  logs: MedDoseLog[],
  day: string,
): Array<{ log: MedDoseLog; med: Medication }> {
  const prn = new Map(meds.filter((m) => m.frequency === 'asNeeded').map((m) => [m.id, m]))
  return logs
    .filter((l) => l.day === day && prn.has(l.medId))
    .map((l) => ({ log: l, med: prn.get(l.medId)! }))
    .sort((a, b) => b.log.takenAt.localeCompare(a.log.takenAt))
}

export interface DayProgress {
  /** الجرعات المأخوذة فعلًا */
  taken: number
  /** الجرعات المسجّلة كمتخطّاة */
  skipped: number
  /** مجموع الجرعات المستحقّة في اليوم */
  total: number
  /** المتبقّي بلا تسجيل */
  remaining: number
  /** النسبة (٠..١) للحلقة وشريط التقدّم — واحد صحيح حين لا جرعات أصلًا */
  ratio: number
}

export function dayProgress(slots: DoseSlot[]): DayProgress {
  const taken = slots.filter((s) => s.log && !s.log.skipped).length
  const skipped = slots.filter((s) => s.log?.skipped).length
  const total = slots.length
  return {
    taken,
    skipped,
    total,
    remaining: total - taken - skipped,
    ratio: total === 0 ? 1 : (taken + skipped) / total,
  }
}

/** الوقت الحالي بصيغة "HH:MM" — الصيغة نفسها التي تُخزَّن بها أوقات الجرعات */
export function clockOf(date: Date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** جرعة فات وقتها ولم تُسجَّل بعد */
export function isOverdue(slot: DoseSlot, now: Date = new Date()): boolean {
  if (slot.log) return false
  const today = dayKeyOf(now)
  if (slot.day < today) return true
  if (slot.day > today) return false
  return slot.time < clockOf(now)
}

/**
 * الجرعة التي يجب أن تُعرض الآن: أقدم جرعة فات وقتها، وإلا أقرب جرعة قادمة.
 *
 * المتأخّرة تسبق القادمة عمدًا — الغرض من الشاشة تدارك ما فات لا استعراض
 * ما هو آتٍ.
 */
export function nextDose(slots: DoseSlot[], now: Date = new Date()): DoseSlot | null {
  const pending = slots.filter((s) => !s.log)
  return pending.find((s) => isOverdue(s, now)) ?? pending[0] ?? null
}

// ---------- تسميات عربية ----------

/** وقت جرعة "HH:MM" بصيغة عربية مقروءة: «٨:٠٠ ص» */
export function formatSlotTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(2000, 0, 1, h || 0, m || 0)
  return d.toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit' })
}

export const WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

/** وصف الجدول في سطر واحد: «٣ مرات يوميًا» / «يوم بعد يوم» */
export function scheduleLabel(med: Medication): string {
  if (med.frequency === 'asNeeded') return 'عند اللزوم'

  const perDay =
    med.times.length === 1
      ? 'مرة'
      : med.times.length === 2
        ? 'مرتين'
        : `${med.times.length} مرات`

  switch (med.frequency) {
    case 'daily':
      return `${perDay} يوميًا`
    case 'everyNDays': {
      const step = Math.max(1, Math.round(med.everyDays ?? 2))
      if (step === 1) return `${perDay} يوميًا`
      const every = step === 2 ? 'يوم بعد يوم' : `كل ${step} أيام`
      return med.times.length === 1 ? every : `${perDay} — ${every}`
    }
    case 'weekdays': {
      const days = (med.weekdays ?? []).map((d) => WEEKDAY_NAMES[d]).filter(Boolean)
      if (days.length === 0) return perDay
      const list = days.length > 3 ? `${days.length} أيام بالأسبوع` : days.join('، ')
      return med.times.length === 1 ? list : `${perDay} — ${list}`
    }
  }
}

const FORM_LABELS: Record<Medication['form'], string> = {
  pill: 'حبوب',
  capsule: 'كبسولة',
  suppository: 'تحميلة',
  injection: 'إبرة',
  syrup: 'شراب',
  drops: 'قطرة',
  topical: 'مرهم',
  other: 'أخرى',
}

export const formLabel = (form: Medication['form']): string => FORM_LABELS[form] ?? 'أخرى'

export const MED_FORMS = Object.entries(FORM_LABELS).map(([value, label]) => ({
  value: value as Medication['form'],
  label,
}))
