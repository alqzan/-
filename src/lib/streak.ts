// =============================================================
// سلسلة التوثيق.
//
// أكثر ما يقتل تطبيقات الذكريات هو الانقطاع الصامت: يوثّق الأهل بحماس
// شهرين ثم ينسون، ولا شيء ينبّههم. هنا نقيس **بالأسابيع لا بالأيام**
// عن قصد: توثيق يومي مطلب قاسٍ على أهل مولود جديد، وأسبوع واحد فيه
// صورة أو سطر يكفي ليبقى الخيط متّصلًا.
// =============================================================

const WEEK_MS = 7 * 86400000

export interface StreakInfo {
  /** عدد الأسابيع المتتالية التي فيها توثيق (تشمل الأسبوع الحالي) */
  weeks: number
  /** أطول سلسلة تحقّقت في الرحلة كلها */
  best: number
  /** الأيام منذ آخر توثيق — null إذا لم يُوثَّق شيء بعد */
  daysSince: number | null
  /** حالة آخر ٨ أسابيع من الأقدم إلى الأحدث — للعرض كنقاط */
  recentWeeks: boolean[]
}

/** بداية أسبوع التاريخ (الأحد ٠٠:٠٠ بتوقيت الجهاز) */
function weekStart(d: Date): number {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  start.setDate(start.getDate() - start.getDay())
  start.setHours(0, 0, 0, 0)
  return start.getTime()
}

/**
 * يحسب السلسلة من تواريخ كل ما وُثّق.
 *
 * الأسبوع الحالي لا يكسر السلسلة إن كان فارغًا: ما زال أمام الأهل بقيّته.
 * الكسر يبدأ من الأسبوع الماضي فما قبله.
 */
export function documentationStreak(dates: string[], now: Date = new Date()): StreakInfo {
  const weeks = new Set<number>()
  let latest = -Infinity

  for (const iso of dates) {
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) continue
    // التواريخ المستقبلية (موعد مسجَّل مقدَّمًا) ليست توثيقًا لما مضى
    if (t > now.getTime()) continue
    weeks.add(weekStart(new Date(t)))
    if (t > latest) latest = t
  }

  const current = weekStart(now)

  let streak = 0
  // نبدأ من الأسبوع الحالي إن كان فيه توثيق، وإلا من الأسبوع الذي قبله
  let cursor = weeks.has(current) ? current : current - WEEK_MS
  while (weeks.has(cursor)) {
    streak += 1
    cursor -= WEEK_MS
  }

  // أطول سلسلة: نمشي على الأسابيع المرتّبة ونعدّ المتجاورة
  const sorted = [...weeks].sort((a, b) => a - b)
  let best = 0
  let run = 0
  let previous: number | null = null
  for (const w of sorted) {
    run = previous !== null && w - previous === WEEK_MS ? run + 1 : 1
    previous = w
    if (run > best) best = run
  }

  const recentWeeks: boolean[] = []
  for (let i = 7; i >= 0; i--) recentWeeks.push(weeks.has(current - i * WEEK_MS))

  return {
    weeks: streak,
    best: Math.max(best, streak),
    daysSince:
      latest === -Infinity ? null : Math.floor((now.getTime() - latest) / 86400000),
    recentWeeks,
  }
}
