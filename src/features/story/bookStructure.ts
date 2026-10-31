// =============================================================
// بنية كتاب الذكريات — منطق نقي بلا React.
//
// الكتاب يكبر مع الطفل، فلا يصحّ أن يكون شهورًا متصلة لسنوات. يُقسَّم إلى
// أجزاء حسب العمر: رحلة الحمل، ثم السنة الأولى، الثانية، الثالثة… وداخل
// كل جزء فصول شهرية. القسمة تُشتق من تاريخ الولادة وتواريخ الذكريات فقط،
// فلا تُخزَّن ولا تمسّ البيانات.
// =============================================================
import { pluralAr } from '../../lib/format'
import { ageInDays, ageInMonths } from '../../lib/localDate'

const YEAR_ORDINALS = [
  'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة',
  'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة',
  'الثالثة عشرة', 'الرابعة عشرة', 'الخامسة عشرة', 'السادسة عشرة',
  'السابعة عشرة', 'الثامنة عشرة',
]

export interface BookPart {
  /** مفتاح ترتيبي ثابت: `pregnancy` أو `year-N` */
  key: string
  title: string
  subtitle: string
}

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

/** أشهر مرّت من شهر الولادة (تقويميًا) إلى شهر تاريخ معيّن — سالب قبل الولادة */
function monthsSinceBirth(bornAt: string, at: Date): number {
  const born = new Date(bornAt)
  return (at.getFullYear() - born.getFullYear()) * 12 + (at.getMonth() - born.getMonth())
}

/** أي جزء من الكتاب يقع فيه هذا التاريخ */
export function partOf(bornAt: string | null | undefined, at: Date): BookPart {
  if (!bornAt || at.getTime() < startOfMonth(new Date(bornAt)).getTime()) {
    return { key: 'pregnancy', title: 'رحلة الحمل', subtitle: 'قبل أن يصل' }
  }
  const year = Math.floor(monthsSinceBirth(bornAt, at) / 12)
  const ordinal = YEAR_ORDINALS[year] ?? `${year + 1}`
  return {
    key: `year-${String(year).padStart(2, '0')}`,
    title: `السنة ${ordinal}`,
    subtitle: year === 0 ? 'من يوم وصل' : `العام ${year + 1} من عمره`,
  }
}

/** عمر الطفل للغلاف: «٢٠ يومًا» ثم «٥ أشهر» ثم «سنتان و٣ أشهر» */
export function bookAgeLabel(bornAt: string, now: Date = new Date()): string {
  const days = ageInDays(bornAt, now)
  if (days < 31) return pluralAr(days, 'يوم واحد', 'يومان', 'أيام', 'يومًا')
  const months = ageInMonths(bornAt, now)
  const years = Math.floor(months / 12)
  const rest = months % 12
  const monthsLabel = pluralAr(rest, 'شهر', 'شهران', 'أشهر', 'شهرًا')
  if (years === 0) return pluralAr(months, 'شهر واحد', 'شهران', 'أشهر', 'شهرًا')
  const yearsLabel = pluralAr(years, 'سنة', 'سنتان', 'سنوات', 'سنة')
  return rest === 0 ? yearsLabel : `${yearsLabel} و${monthsLabel}`
}

export interface PartGroup<T> {
  part: BookPart
  items: T[]
}

/** تجميع عناصر مرتّبة زمنيًا في أجزاء، مع إبقاء الترتيب الأصلي */
export function groupByPart<T extends { date: string }>(
  items: T[],
  bornAt: string | null | undefined,
): Array<PartGroup<T>> {
  const groups = new Map<string, PartGroup<T>>()
  for (const item of items) {
    const part = partOf(bornAt, new Date(item.date))
    let group = groups.get(part.key)
    if (!group) groups.set(part.key, (group = { part, items: [] }))
    group.items.push(item)
  }
  return [...groups.values()].sort((a, b) => a.part.key.localeCompare(b.part.key))
}
