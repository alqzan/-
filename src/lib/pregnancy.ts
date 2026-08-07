import { differenceInCalendarDays } from 'date-fns'
import { pluralAr } from './format'

const DAY = 24 * 60 * 60 * 1000
const FULL_TERM_DAYS = 280 // 40 أسبوعًا

// =============================================================
// عمر الحمل — بالاصطلاح الطبي المتّبع في التقارير والسونار.
//
// المرجع هو ما تقوله الطبيبة وما يُكتب في تقرير السونار: «٢٤+٣»
// تعني **٢٤ أسبوعًا كاملًا** وثلاثة أيام. الأسبوع يُعدّ مكتملًا لا جاريًا،
// ولذلك في يوم الولادة المتوقّع (٢٨٠ يومًا) يكون العمر ٤٠ أسبوعًا بالضبط.
//
// كان التطبيق يعدّ الأسبوع الجاري (`floor(days/7) + 1`) فيسبق تقرير
// الطبيبة بأسبوع كامل دائمًا: يقول «٢٥» وهي تقول «٢٤»، ويقول «٤١» في
// يوم الموعد نفسه. ومعه انزلق كل ما يُبنى على الرقم — معلومة تطوّر
// الجنين ومقاس حجمه، وبداية الثلث الثالث قبل أوانها بأسبوع.
// =============================================================

export interface PregnancyProgress {
  /** الأسابيع المكتملة (0..40+) — الرقم نفسه الذي تقوله الطبيبة */
  week: number
  /** الأيام بعد الأسبوع المكتمل (0..6) — الرقم بعد «+» في التقرير */
  dayOfWeek: number
  /** إجمالي الأيام منذ آخر دورة */
  totalDays: number
  /** الأيام المتبقية حتى موعد الولادة */
  daysLeft: number
  /**
   * موعد الولادة المتوقّع (ISO) — المُدخَل إن وُجد، وإلا المشتقّ من آخر دورة.
   * كانت الواجهة تعرض «—» لمن أدخل آخر دورة فقط، رغم أنها تعرض في السطر
   * نفسه «باقٍ ١٠٩ أيام» محسوبةً من ذلك الموعد بالذات.
   */
  due: string
  /** نسبة اكتمال الحمل 0..1 */
  progress: number
  /** الثلث (1/2/3) */
  trimester: 1 | 2 | 3
}

/**
 * يحسب تقدّم الحمل. يعتمد على تاريخ آخر دورة إن وُجد،
 * وإلا يشتقّه من موعد الولادة المتوقّع (due - 280 يوم).
 */
export function getPregnancyProgress(
  lmpDate: string | null,
  dueDate: string | null,
  now: Date = new Date(),
): PregnancyProgress | null {
  let lmp: Date | null = null
  if (lmpDate) {
    lmp = new Date(lmpDate)
  } else if (dueDate) {
    lmp = new Date(new Date(dueDate).getTime() - FULL_TERM_DAYS * DAY)
  }
  if (!lmp) return null

  // بالأيام التقويمية لا بفارق اللحظات: التواريخ تُخزَّن عند منتصف النهار،
  // فكان الفارق الزمني ينقص يومًا كاملًا قبل الظهر. النتيجة أن الرقم كان
  // يقفز ظهرًا — «٢٨+٤» صباحًا و«٢٨+٥» بعد الظهر من اليوم نفسه. عمر الحمل
  // يتغيّر عند منتصف الليل كالتاريخ، ولا شأن له بساعة فتح التطبيق.
  const totalDays = Math.max(0, differenceInCalendarDays(now, lmp))
  const week = Math.floor(totalDays / 7)
  const dayOfWeek = totalDays % 7

  const due = dueDate
    ? new Date(dueDate)
    : new Date(lmp.getTime() + FULL_TERM_DAYS * DAY)
  const daysLeft = differenceInCalendarDays(due, now)

  const progress = Math.max(0, Math.min(1, totalDays / FULL_TERM_DAYS))

  let trimester: 1 | 2 | 3 = 1
  if (week >= 28) trimester = 3
  else if (week >= 14) trimester = 2

  return { week, dayOfWeek, totalDays, daysLeft, progress, trimester, due: due.toISOString() }
}

export function trimesterLabel(t: 1 | 2 | 3): string {
  return t === 1 ? 'الثلث الأول' : t === 2 ? 'الثلث الثاني' : 'الثلث الثالث'
}

/** عمر الحمل كما يُقال: «٢٤ أسبوعًا و٣ أيام» */
export function gestationLabel(week: number, dayOfWeek: number): string {
  const weeks = pluralAr(week, 'أسبوع واحد', 'أسبوعان', 'أسابيع', 'أسبوعًا')
  if (dayOfWeek === 0) return `${weeks} تمامًا`
  return `${weeks} و${pluralAr(dayOfWeek, 'يوم واحد', 'يومان', 'أيام', 'يومًا')}`
}

/**
 * يشتقّ تاريخ آخر دورة من عمر حمل قالته الطبيبة في يوم زيارة معيّن.
 *
 * الطبيبة تقيس بالسونار لا بالتقويم، وقياسها يصحّح تاريخ آخر دورة حين
 * يكون منسيًّا أو غير دقيق أو حين تكون الدورة غير منتظمة. فبدل أن يُطالَب
 * الوالدان بحساب تاريخ يوافق ما قيل لهما، يُدخلان ما سمعاه كما هو
 * ونحسب نحن الباقي.
 *
 * @param week الأسابيع المكتملة كما قالتها الطبيبة
 * @param dayOfWeek الأيام بعدها (٠..٦)
 * @param visitISO يوم الزيارة التي قيل فيها هذا الرقم
 */
export function lmpFromGestation(
  week: number,
  dayOfWeek: number,
  visitISO: string,
): { lmpDate: string; dueDate: string } {
  const elapsed = Math.max(0, Math.round(week) * 7 + Math.round(dayOfWeek))
  const visit = new Date(visitISO)
  const lmp = new Date(visit.getTime() - elapsed * DAY)
  return {
    lmpDate: lmp.toISOString(),
    dueDate: new Date(lmp.getTime() + FULL_TERM_DAYS * DAY).toISOString(),
  }
}
