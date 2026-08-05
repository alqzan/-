// =============================================================
// سلسلة التوثيق.
//
// أكثر ما يقتل تطبيقات الذكريات هو الانقطاع الصامت: يوثّق الأهل بحماس
// شهرين ثم ينسون، ولا شيء ينبّههم. هنا نقيس **بالأسابيع لا بالأيام**
// عن قصد: توثيق يومي مطلب قاسٍ على أهل مولود جديد، وأسبوع واحد فيه
// صورة أو سطر يكفي ليبقى الخيط متّصلًا.
// =============================================================

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
 * الأسبوع الذي يسبق أسبوعًا معيّنًا.
 *
 * الطرح بـ ٧×٨٦٤٠٠٠٠٠ يبدو صحيحًا وليس كذلك: الأسبوع الذي يتغيّر فيه
 * التوقيت الصيفي طوله ٢٣ أو ٢٥ ساعة، فيقع الناتج داخل الأسبوع السابق أو
 * بعده — فتنكسر سلسلة متّصلة أو تُحسب واحدة غير متّصلة. الحساب بالتقويم
 * (سبعة أيام للخلف ثم بداية اليوم) صحيح في كل المناطق الزمنية.
 */
function previousWeek(weekStartMs: number): number {
  const d = new Date(weekStartMs)
  d.setDate(d.getDate() - 7)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
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
  let cursor = weeks.has(current) ? current : previousWeek(current)
  while (weeks.has(cursor)) {
    streak += 1
    cursor = previousWeek(cursor)
  }

  // أطول سلسلة: نمشي على الأسابيع المرتّبة ونعدّ المتجاورة
  const sorted = [...weeks].sort((a, b) => a - b)
  let best = 0
  let run = 0
  let previous: number | null = null
  for (const w of sorted) {
    run = previous !== null && previousWeek(w) === previous ? run + 1 : 1
    previous = w
    if (run > best) best = run
  }

  // آخر ثمانية أسابيع من الأقدم إلى الأحدث
  const recent: number[] = [current]
  for (let i = 0; i < 7; i++) recent.unshift(previousWeek(recent[0]))
  const recentWeeks = recent.map((w) => weeks.has(w))

  return {
    weeks: streak,
    best: Math.max(best, streak),
    daysSince:
      latest === -Infinity ? null : Math.floor((now.getTime() - latest) / 86400000),
    recentWeeks,
  }
}
