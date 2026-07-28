export function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localDateToIso(value: string): string {
  if (!value) {
    throw new Error('localDateToIso: قيمة التاريخ فارغة')
  }
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('localDateToIso: قيمة التاريخ غير صالحة')
  }
  return new Date(year, month - 1, day, 12, 0, 0).toISOString()
}

/** هل التاريخان في اليوم نفسه بتوقيت الجهاز؟ */
export function isSameLocalDay(a: string | Date, b: string | Date = new Date()): boolean {
  const da = typeof a === 'string' ? new Date(a) : a
  const db = typeof b === 'string' ? new Date(b) : b
  return localDateInputValue(da) === localDateInputValue(db)
}

/** عمر الطفل بالأيام منذ تاريخ الولادة */
export function ageInDays(bornAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(bornAt).getTime()) / 86400000))
}

/** عمر الطفل بالأشهر التقريبية */
export function ageInMonths(bornAt: string, now: Date = new Date()): number {
  const born = new Date(bornAt)
  let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
  if (now.getDate() < born.getDate()) months -= 1
  return Math.max(0, months)
}
