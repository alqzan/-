import { describe, expect, it } from 'vitest'
import { getPregnancyProgress, trimesterLabel } from './pregnancy'
import { ageInDays, ageInMonths, isSameLocalDay, localDateInputValue, localDateToIso } from './localDate'

// دوال حسابية خالصة — أخطاؤها صامتة ولا تظهر إلا كرقم غلط على الشاشة.

describe('getPregnancyProgress', () => {
  it('يرجع null بلا تاريخ آخر دورة ولا موعد متوقّع', () => {
    expect(getPregnancyProgress(null, null)).toBeNull()
  })

  it('يحسب الأسبوع من تاريخ آخر دورة', () => {
    const now = new Date('2026-08-03T12:00:00')
    // ٧٠ يومًا = ١٠ أسابيع كاملة، فنحن في الأسبوع ١١
    const lmp = new Date('2026-05-25T12:00:00').toISOString()
    const p = getPregnancyProgress(lmp, null, now)
    expect(p!.week).toBe(11)
    expect(p!.dayOfWeek).toBe(0)
    expect(p!.totalDays).toBe(70)
  })

  it('يشتقّ تاريخ آخر دورة من الموعد المتوقّع حين لا يُعطى', () => {
    const now = new Date('2026-08-03T12:00:00')
    const due = new Date('2026-11-21T12:00:00').toISOString()
    const p = getPregnancyProgress(null, due, now)
    expect(p).not.toBeNull()
    expect(p!.daysLeft).toBe(110)
  })

  it('يصنّف الثلث حسب الأسبوع', () => {
    const now = new Date('2026-08-03T12:00:00')
    const weeksAgo = (w: number) =>
      new Date(now.getTime() - (w - 1) * 7 * 86400000).toISOString()

    expect(getPregnancyProgress(weeksAgo(8), null, now)!.trimester).toBe(1)
    expect(getPregnancyProgress(weeksAgo(20), null, now)!.trimester).toBe(2)
    expect(getPregnancyProgress(weeksAgo(30), null, now)!.trimester).toBe(3)
  })

  it('يحصر نسبة التقدّم بين صفر وواحد', () => {
    const now = new Date('2026-08-03T12:00:00')
    const veryOld = new Date('2024-01-01T12:00:00').toISOString()
    const p = getPregnancyProgress(veryOld, null, now)
    expect(p!.progress).toBe(1)
  })

  it('لا يعطي أيامًا سالبة قبل تاريخ آخر دورة', () => {
    const now = new Date('2026-08-03T12:00:00')
    const future = new Date('2026-09-01T12:00:00').toISOString()
    expect(getPregnancyProgress(future, null, now)!.totalDays).toBe(0)
  })

  it('يسمّي الأثلاث بالعربية', () => {
    expect(trimesterLabel(1)).toBe('الثلث الأول')
    expect(trimesterLabel(3)).toBe('الثلث الثالث')
  })
})

describe('localDate', () => {
  it('يدور التاريخ ذهابًا وإيابًا بلا انزياح يوم', () => {
    // الخطأ الكلاسيكي: new Date("2026-08-01") = منتصف ليل UTC،
    // فيظهر يومًا سابقًا في التوقيتات السالبة.
    for (const value of ['2026-01-01', '2026-08-03', '2026-12-31']) {
      const iso = localDateToIso(value)
      expect(localDateInputValue(new Date(iso))).toBe(value)
    }
  })

  it('يقارن اليوم المحلي بصرف النظر عن الساعة', () => {
    const morning = new Date(2026, 7, 3, 1, 0, 0)
    const night = new Date(2026, 7, 3, 23, 30, 0)
    expect(isSameLocalDay(morning, night)).toBe(true)
    expect(isSameLocalDay(morning, new Date(2026, 7, 4, 1, 0, 0))).toBe(false)
  })

  it('يحسب عمر الطفل بالأيام', () => {
    const born = new Date(2026, 7, 1, 12, 0, 0).toISOString()
    const now = new Date(2026, 7, 11, 12, 0, 0)
    expect(ageInDays(born, now)).toBe(10)
  })

  it('لا يعطي عمرًا سالبًا لتاريخ ولادة مستقبلي', () => {
    const born = new Date(2026, 8, 1, 12, 0, 0).toISOString()
    const now = new Date(2026, 7, 1, 12, 0, 0)
    expect(ageInDays(born, now)).toBe(0)
  })

  it('يحسب العمر بالأشهر ولا يعدّ الشهر قبل اكتماله', () => {
    const born = new Date(2026, 0, 15, 12, 0, 0).toISOString()
    expect(ageInMonths(born, new Date(2026, 2, 14, 12, 0, 0))).toBe(1)
    expect(ageInMonths(born, new Date(2026, 2, 15, 12, 0, 0))).toBe(2)
  })
})
