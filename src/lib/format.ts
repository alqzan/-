// أدوات تنسيق عربية للتواريخ والأرقام

// نستخدم 'ar' (تقويم ميلادي بأرقام عربية) لتوافق منتقيات التاريخ في التطبيق.
const AR_LOCALE = 'ar'

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString(AR_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString(AR_LOCALE, { day: 'numeric', month: 'long' })
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleTimeString(AR_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDateTime(iso: string | Date): string {
  return `${formatShortDate(iso)} • ${formatTime(iso)}`
}

/** تنسيق مدة بالثواني إلى د:ث */
export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = Math.floor(totalSec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// العربية تميّز المفرد والمثنى والجمع، فـ«قبل 2 دقيقة» خطأ نحوي واضح.
// Intl يتكفّل بذلك ويعطي «قبل دقيقتين» و«قبل ٣ دقائق» تلقائيًا.
const relativeFormatter = new Intl.RelativeTimeFormat(AR_LOCALE, { numeric: 'auto' })

/** وصف نسبي: «الآن»، «قبل دقيقتين»، «أمس»… */
export function relativeFromNow(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return relativeFormatter.format(-mins, 'minute')
  const hours = Math.floor(mins / 60)
  if (hours < 24) return relativeFormatter.format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  if (days < 30) return relativeFormatter.format(-days, 'day')
  const months = Math.floor(days / 30)
  if (months < 12) return relativeFormatter.format(-months, 'month')
  return relativeFormatter.format(-Math.floor(days / 365), 'year')
}

/** صيغة عربية سليمة للعدّ: «يوم واحد»، «يومان»، «٥ أيام» */
export function pluralAr(count: number, one: string, two: string, few: string, many: string): string {
  const rules = new Intl.PluralRules(AR_LOCALE)
  switch (rules.select(count)) {
    case 'one':
      return one
    case 'two':
      return two
    case 'few':
      return `${count} ${few}`
    case 'many':
      return `${count} ${many}`
    default:
      return `${count} ${many}`
  }
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

/** مفتاح شهر لتجميع الصور: "يناير 2026" */
export function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export const parentLabel = (p: 'mom' | 'dad') => (p === 'mom' ? 'أمي' : 'أبي')
