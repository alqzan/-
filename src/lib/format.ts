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

/** وصف نسبي بسيط: منذ كم (باليوم/الساعة) */
export function relativeFromNow(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `قبل ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'أمس'
  return `قبل ${days} يوم`
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
