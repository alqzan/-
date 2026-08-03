import { differenceInDays } from 'date-fns'

const DAY = 24 * 60 * 60 * 1000
const FULL_TERM_DAYS = 280 // 40 أسبوعًا

export interface PregnancyProgress {
  /** الأسبوع الحالي (1..40+) */
  week: number
  /** اليوم داخل الأسبوع (0..6) */
  dayOfWeek: number
  /** إجمالي الأيام منذ آخر دورة */
  totalDays: number
  /** الأيام المتبقية حتى موعد الولادة */
  daysLeft: number
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

  const totalDays = Math.max(0, differenceInDays(now, lmp))
  const week = Math.floor(totalDays / 7) + 1
  const dayOfWeek = totalDays % 7

  const due = dueDate
    ? new Date(dueDate)
    : new Date(lmp.getTime() + FULL_TERM_DAYS * DAY)
  const daysLeft = differenceInDays(due, now)

  const progress = Math.max(0, Math.min(1, totalDays / FULL_TERM_DAYS))

  let trimester: 1 | 2 | 3 = 1
  if (week >= 28) trimester = 3
  else if (week >= 14) trimester = 2

  return { week, dayOfWeek, totalDays, daysLeft, progress, trimester }
}

export function trimesterLabel(t: 1 | 2 | 3): string {
  return t === 1 ? 'الثلث الأول' : t === 2 ? 'الثلث الثاني' : 'الثلث الثالث'
}
