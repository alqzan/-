// ============================================================
// تحقّق مركزي من صحة المدخلات — رسائل خطأ عربية واضحة تُعرض
// بجانب الحقل المعني (وليس فقط بتعطيل زر الحفظ).
// ============================================================

import { localDateToIso } from './localDate'

/** نسخة آمنة من localDateToIso: تُرجع null بدل رمي استثناء عند قيمة فارغة/غير صالحة. */
export function safeLocalDateToIso(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return localDateToIso(value)
  } catch {
    return null
  }
}

const todayStart = (): number => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function parseDateValue(value: string): number | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 0, 0, 0).getTime()
}

/** A1: تاريخ ولادة فارغ أو في المستقبل */
export function validateBirthDate(value: string): string | null {
  if (!value) return 'يجب إدخال تاريخ الولادة.'
  const t = parseDateValue(value)
  if (t == null) return 'تاريخ الولادة غير صالح.'
  if (t > todayStart()) return 'تاريخ الولادة لا يمكن أن يكون في المستقبل.'
  return null
}

/** A2: تاريخ عام (ذكرى/قياس/تطعيم) — غير فارغ وصالح، مع منع المستقبل اختياريًا */
export function validateDate(
  value: string,
  { label = 'التاريخ', allowFuture = true, allowEmpty = false }: {
    label?: string
    allowFuture?: boolean
    allowEmpty?: boolean
  } = {},
): string | null {
  if (!value) return allowEmpty ? null : `يجب إدخال ${label}.`
  const t = parseDateValue(value)
  if (t == null) return `${label} غير صالح.`
  if (!allowFuture && t > todayStart()) return `${label} لا يمكن أن يكون في المستقبل.`
  return null
}

/** A3: قياسات وأرقام موجبة ومعقولة (وزن/طول/كمية/مدة/عمر تطعيم) */
export function validateNumberInRange(
  raw: string,
  { label, min = 0, max, required = false }: { label: string; min?: number; max?: number; required?: boolean },
): string | null {
  if (!raw) return required ? `يجب إدخال ${label}.` : null
  const n = Number(raw)
  if (!Number.isFinite(n)) return `${label} يجب أن يكون رقمًا صالحًا.`
  if (n < min) return `${label} لا يمكن أن يكون سالبًا.`
  if (max != null && n > max) return `${label} يبدو غير معقول (الحد الأقصى ${max}).`
  return null
}

// حدود معقولة لكل نوع قياس — تسمح بهامش واسع دون رفض قيم واقعية نادرة
export const MEASUREMENT_LIMITS = {
  weightKg: { min: 0, max: 200, label: 'الوزن' },
  lengthCm: { min: 0, max: 200, label: 'الطول' },
  headCm: { min: 0, max: 100, label: 'محيط الرأس' },
  amountMl: { min: 0, max: 1000, label: 'الكمية' },
  durationMin: { min: 0, max: 600, label: 'المدة' },
  vaccineAgeMonths: { min: 0, max: 216, label: 'العمر المستحق' },
} as const

/** A4: رضعة (ثدي/رضّاعة) بلا كمية ولا مدة */
export function validateFeedingAmounts(
  amountMl: string,
  durationMin: string,
): string | null {
  if (!amountMl && !durationMin) {
    return 'أدخلوا الكمية أو المدة على الأقل.'
  }
  return (
    validateNumberInRange(amountMl, MEASUREMENT_LIMITS.amountMl) ||
    validateNumberInRange(durationMin, MEASUREMENT_LIMITS.durationMin)
  )
}

/** A5: كبسولة زمنية بتاريخ فتح في الماضي */
export function validateCapsuleOpenDate(value: string): string | null {
  if (!value) return 'يجب اختيار تاريخ الفتح.'
  const t = parseDateValue(value)
  if (t == null) return 'تاريخ الفتح غير صالح.'
  if (t <= todayStart()) return 'تاريخ فتح الكبسولة يجب أن يكون في المستقبل.'
  return null
}

/**
 * A6: تعارض بين تاريخ آخر دورة (LMP) وموعد الولادة المتوقع.
 * الحمل الطبيعي يمتد قرابة 280 يومًا (40 أسبوعًا) من تاريخ آخر دورة —
 * نسمح بهامش ±21 يومًا قبل اعتبار القيمتين متعارضتين.
 */
export function validateLmpDueConsistency(
  lmpDate: string | null | undefined,
  dueDate: string | null | undefined,
): string | null {
  if (!lmpDate || !dueDate) return null
  const lmp = parseDateValue(lmpDate)
  const due = parseDateValue(dueDate)
  if (lmp == null || due == null) return null
  const expectedDue = lmp + 280 * 86400000
  const diffDays = Math.round((due - expectedDue) / 86400000)
  if (Math.abs(diffDays) > 21) {
    return 'تاريخ آخر دورة وموعد الولادة المتوقع غير متطابقين تقريبًا — تحقّقوا من التاريخين (الفرق حوالي 280 يومًا عادة).'
  }
  return null
}

/** يحسب موعد الولادة المتوقع من تاريخ آخر دورة (280 يومًا) بصيغة YYYY-MM-DD */
export function dueDateFromLmp(lmpDate: string): string | null {
  const lmp = parseDateValue(lmpDate)
  if (lmp == null) return null
  const due = new Date(lmp + 280 * 86400000)
  const year = due.getFullYear()
  const month = String(due.getMonth() + 1).padStart(2, '0')
  const day = String(due.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
