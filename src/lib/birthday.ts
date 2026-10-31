export interface BirthdayInfo {
  /** عمر الطفل في هذا العيد (١ للأول) */
  turning: number
  /** أيام متبقية؛ ٠ يوم العيد */
  daysLeft: number
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/**
 * عيد الميلاد القادم أو الجاري. ٢٩ فبراير يُحتفل به في ٢٨ فبراير في السنوات
 * العادية. لا يُرجع شيئًا قبل أن يكمل الطفل يومه الأول.
 */
export function nextBirthday(bornAt: string | null | undefined, now: Date = new Date()): BirthdayInfo | null {
  if (!bornAt) return null
  const born = new Date(bornAt)
  if (Number.isNaN(born.getTime())) return null
  const today = startOfDay(now)

  const occurrence = (year: number) => {
    const month = born.getMonth()
    let day = born.getDate()
    if (month === 1 && day === 29) {
      const leap = new Date(year, 1, 29).getMonth() === 1
      if (!leap) day = 28
    }
    return new Date(year, month, day).getTime()
  }

  let year = now.getFullYear()
  let at = occurrence(year)
  if (at < today) {
    year += 1
    at = occurrence(year)
  }
  const turning = year - born.getFullYear()
  if (turning < 1) return null
  return { turning, daysLeft: Math.round((at - today) / 86_400_000) }
}
