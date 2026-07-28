import { describe, expect, it } from 'vitest'
import {
  dueDateFromLmp,
  MEASUREMENT_LIMITS,
  safeLocalDateToIso,
  validateBirthDate,
  validateCapsuleOpenDate,
  validateDate,
  validateFeedingAmounts,
  validateLmpDueConsistency,
  validateNumberInRange,
} from '../validation'

describe('validateBirthDate', () => {
  it('rejects empty value', () => {
    expect(validateBirthDate('')).toMatch(/يجب إدخال/)
  })

  it('rejects future dates', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const iso = future.toISOString().slice(0, 10)
    expect(validateBirthDate(iso)).toMatch(/المستقبل/)
  })

  it('accepts a valid past date', () => {
    expect(validateBirthDate('2026-01-01')).toBeNull()
  })
})

describe('validateDate', () => {
  it('allows empty when allowEmpty is true', () => {
    expect(validateDate('', { allowEmpty: true })).toBeNull()
  })

  it('requires value when allowEmpty is false (default)', () => {
    expect(validateDate('')).toMatch(/يجب إدخال/)
  })

  it('rejects future date when allowFuture is false', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const iso = future.toISOString().slice(0, 10)
    expect(validateDate(iso, { allowFuture: false })).toMatch(/المستقبل/)
  })

  it('accepts future date when allowFuture is true (default)', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const iso = future.toISOString().slice(0, 10)
    expect(validateDate(iso)).toBeNull()
  })
})

describe('validateNumberInRange', () => {
  it('is optional by default', () => {
    expect(validateNumberInRange('', { label: 'الوزن' })).toBeNull()
  })

  it('is required when required=true', () => {
    expect(validateNumberInRange('', { label: 'الوزن', required: true })).toMatch(/يجب إدخال/)
  })

  it('rejects non-numeric input', () => {
    expect(validateNumberInRange('abc', { label: 'الوزن' })).toMatch(/رقمًا صالحًا/)
  })

  it('rejects negative numbers', () => {
    expect(validateNumberInRange('-5', { label: 'الوزن' })).toMatch(/سالبًا/)
  })

  it('rejects values above max', () => {
    expect(validateNumberInRange('300', MEASUREMENT_LIMITS.weightKg)).toMatch(/غير معقول/)
  })

  it('accepts a sane value within limits', () => {
    expect(validateNumberInRange('3.5', MEASUREMENT_LIMITS.weightKg)).toBeNull()
  })
})

describe('validateFeedingAmounts', () => {
  it('requires at least amount or duration', () => {
    expect(validateFeedingAmounts('', '')).toMatch(/الكمية أو المدة/)
  })

  it('accepts amount only', () => {
    expect(validateFeedingAmounts('120', '')).toBeNull()
  })

  it('accepts duration only', () => {
    expect(validateFeedingAmounts('', '15')).toBeNull()
  })

  it('rejects an out-of-range amount even if duration given', () => {
    expect(validateFeedingAmounts('5000', '15')).toMatch(/غير معقول/)
  })
})

describe('validateCapsuleOpenDate', () => {
  it('requires a value', () => {
    expect(validateCapsuleOpenDate('')).toMatch(/يجب اختيار/)
  })

  it('rejects today/past dates — must be strictly in the future', () => {
    expect(validateCapsuleOpenDate('2020-01-01')).toMatch(/المستقبل/)
  })

  it('accepts a future date', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const iso = future.toISOString().slice(0, 10)
    expect(validateCapsuleOpenDate(iso)).toBeNull()
  })
})

describe('validateLmpDueConsistency (pregnancy date conflicts)', () => {
  it('passes when either date is missing', () => {
    expect(validateLmpDueConsistency(null, '2026-11-21')).toBeNull()
    expect(validateLmpDueConsistency('2026-02-14', null)).toBeNull()
  })

  it('passes when due date is ~280 days after LMP', () => {
    // matches seed.ts fixture: lmp 2026-02-14 -> due 2026-11-21
    expect(validateLmpDueConsistency('2026-02-14', '2026-11-21')).toBeNull()
  })

  it('flags a due date wildly inconsistent with LMP', () => {
    expect(validateLmpDueConsistency('2026-02-14', '2026-03-01')).toMatch(/غير متطابقين/)
  })

  it('allows small deviations within the 21-day margin', () => {
    // expected due from 2026-02-14 is 2026-11-21; 10 days off should pass
    expect(validateLmpDueConsistency('2026-02-14', '2026-12-01')).toBeNull()
  })
})

describe('dueDateFromLmp', () => {
  it('computes ~280 days after LMP', () => {
    expect(dueDateFromLmp('2026-02-14')).toBe('2026-11-21')
  })

  it('returns null for invalid input', () => {
    expect(dueDateFromLmp('')).toBeNull()
  })

  it('round-trips with validateLmpDueConsistency (no conflict reported)', () => {
    const lmp = '2026-03-01'
    const due = dueDateFromLmp(lmp)!
    expect(validateLmpDueConsistency(lmp, due)).toBeNull()
  })
})

describe('safeLocalDateToIso', () => {
  it('returns null for empty/null/undefined instead of throwing', () => {
    expect(safeLocalDateToIso(null)).toBeNull()
    expect(safeLocalDateToIso(undefined)).toBeNull()
    expect(safeLocalDateToIso('')).toBeNull()
  })

  it('converts a valid date string to ISO', () => {
    const iso = safeLocalDateToIso('2026-07-28')
    expect(iso).not.toBeNull()
    expect(iso).toMatch(/^2026-07-28T/)
  })
})
