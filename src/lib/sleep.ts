import type { SleepEntry } from '../data/types'

const DAY_MS = 86_400_000

/**
 * دقائق النوم المنقضية داخل يوم تقويمي معيّن.
 *
 * كان الحساب ينسب النومة كلها ليوم بدايتها، فنوم الليل (٩م–٦ص) يُحسب كله
 * على أمس ويظهر «نوم اليوم» شبه فارغ كل صباح. هنا تُقصّ كل نومة مكتملة على
 * حدود اليوم فيُنسب كل جزء ليومه. عرض فقط — لا يمسّ سجلات النوم.
 */
export function sleepMinutesOn(entries: SleepEntry[], day: Date = new Date()): number {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  const end = start + DAY_MS
  let ms = 0
  for (const s of entries) {
    if (!s.endedAt) continue
    const from = Math.max(new Date(s.startedAt).getTime(), start)
    const to = Math.min(new Date(s.endedAt).getTime(), end)
    if (to > from) ms += to - from
  }
  return ms / 60000
}

/** غفوات اليوم: نومات مكتملة تمسّ هذا اليوم ولا تتجاوز خمس ساعات (ما فوقها نوم ليل) */
export function napsOn(entries: SleepEntry[], day: Date = new Date()): number {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  const end = start + DAY_MS
  return entries.filter((s) => {
    if (!s.endedAt) return false
    const a = new Date(s.startedAt).getTime()
    const b = new Date(s.endedAt).getTime()
    return b > start && a < end && b - a <= 5 * 3_600_000
  }).length
}
