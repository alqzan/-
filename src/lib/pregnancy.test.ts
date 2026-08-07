import { describe, expect, it } from 'vitest'
import { gestationLabel, getPregnancyProgress, lmpFromGestation, trimesterLabel } from './pregnancy'
import { ageInDays, ageInMonths, isSameLocalDay, localDateInputValue, localDateToIso } from './localDate'

// دوال حسابية خالصة — أخطاؤها صامتة ولا تظهر إلا كرقم غلط على الشاشة.

describe('getPregnancyProgress', () => {
  it('يرجع null بلا تاريخ آخر دورة ولا موعد متوقّع', () => {
    expect(getPregnancyProgress(null, null)).toBeNull()
  })

  it('يحسب الأسبوع كما تقوله الطبيبة: أسابيع مكتملة + أيام', () => {
    const now = new Date('2026-08-03T12:00:00')
    // ٧٠ يومًا = ١٠ أسابيع مكتملة بلا أيام زائدة = «١٠+٠» في التقرير
    const lmp = new Date('2026-05-25T12:00:00').toISOString()
    const p = getPregnancyProgress(lmp, null, now)
    expect(p!.week).toBe(10)
    expect(p!.dayOfWeek).toBe(0)
    expect(p!.totalDays).toBe(70)
  })

  it('يطابق تقرير السونار في «الأسبوع+اليوم» عند كل حدّ', () => {
    const lmp = new Date('2026-01-01T12:00:00')
    const at = (days: number) =>
      getPregnancyProgress(lmp.toISOString(), null, new Date(lmp.getTime() + days * 86400000))!

    expect([at(0).week, at(0).dayOfWeek]).toEqual([0, 0])
    expect([at(167).week, at(167).dayOfWeek]).toEqual([23, 6])
    expect([at(168).week, at(168).dayOfWeek]).toEqual([24, 0]) // ٢٤+٠
    expect([at(171).week, at(171).dayOfWeek]).toEqual([24, 3]) // ٢٤+٣
  })

  it('يوم الولادة المتوقّع هو الأسبوع ٤٠ تمامًا لا ٤١', () => {
    // الخطأ الذي كان يسبق تقرير الطبيبة بأسبوع كامل يظهر هنا أوضح ما يكون
    const lmp = new Date('2026-01-01T12:00:00')
    const due = new Date(lmp.getTime() + 280 * 86400000)
    const p = getPregnancyProgress(lmp.toISOString(), null, due)!
    expect(p.week).toBe(40)
    expect(p.dayOfWeek).toBe(0)
  })

  it('يشتقّ تاريخ آخر دورة من الموعد المتوقّع حين لا يُعطى', () => {
    const now = new Date('2026-08-03T12:00:00')
    const due = new Date('2026-11-21T12:00:00').toISOString()
    const p = getPregnancyProgress(null, due, now)
    expect(p).not.toBeNull()
    expect(p!.daysLeft).toBe(110)
  })

  it('يصنّف الثلث على حدوده الطبية: ١٤+٠ و٢٨+٠', () => {
    const lmp = new Date('2026-01-01T12:00:00')
    const atWeek = (w: number, d = 0) =>
      getPregnancyProgress(
        lmp.toISOString(),
        null,
        new Date(lmp.getTime() + (w * 7 + d) * 86400000),
      )!.trimester

    expect(atWeek(13, 6)).toBe(1)
    expect(atWeek(14)).toBe(2) // الثلث الثاني يبدأ من ١٤+٠ لا قبله
    expect(atWeek(27, 6)).toBe(2)
    expect(atWeek(28)).toBe(3) // والثالث من ٢٨+٠
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

describe('lmpFromGestation — الضبط على قول الطبيبة', () => {
  it('يعيد التطبيق إلى الرقم نفسه الذي قالته الطبيبة في يوم الزيارة', () => {
    const visit = new Date('2026-08-07T12:00:00')
    // «أنتِ في الأسبوع ٢٤ وثلاثة أيام»
    const { lmpDate, dueDate } = lmpFromGestation(24, 3, visit.toISOString())

    const p = getPregnancyProgress(lmpDate, dueDate, visit)!
    expect(p.week).toBe(24)
    expect(p.dayOfWeek).toBe(3)
  })

  it('يتقدّم يومًا بيوم بعد الزيارة', () => {
    const visit = new Date('2026-08-07T12:00:00')
    const { lmpDate, dueDate } = lmpFromGestation(24, 5, visit.toISOString())
    const after = (days: number) =>
      getPregnancyProgress(lmpDate, dueDate, new Date(visit.getTime() + days * 86400000))!

    expect([after(1).week, after(1).dayOfWeek]).toEqual([24, 6])
    expect([after(2).week, after(2).dayOfWeek]).toEqual([25, 0]) // ينتقل للأسبوع التالي
    expect([after(9).week, after(9).dayOfWeek]).toEqual([26, 0])
  })

  it('يحسب موعد الولادة على ٢٨٠ يومًا من آخر دورة المشتقّة', () => {
    const visit = new Date('2026-08-07T12:00:00')
    const { lmpDate, dueDate } = lmpFromGestation(24, 0, visit.toISOString())
    const days = Math.round((new Date(dueDate).getTime() - new Date(lmpDate).getTime()) / 86400000)
    expect(days).toBe(280)
    // باقٍ ١٦ أسبوعًا على الموعد من يوم الزيارة
    const left = Math.round((new Date(dueDate).getTime() - visit.getTime()) / 86400000)
    expect(left).toBe(112)
  })
})

describe('gestationLabel', () => {
  it('يصوغ العمر بالعربية الصحيحة', () => {
    expect(gestationLabel(24, 0)).toBe('24 أسبوعًا تمامًا')
    expect(gestationLabel(24, 1)).toBe('24 أسبوعًا ويوم واحد')
    expect(gestationLabel(24, 3)).toBe('24 أسبوعًا و3 أيام')
    // المثنّى والمفرد بلا رقم — «أسبوعان» لا «2 أسبوعان»
    expect(gestationLabel(2, 0)).toBe('أسبوعان تمامًا')
    expect(gestationLabel(1, 2)).toBe('أسبوع واحد ويومان')
    expect(gestationLabel(9, 0)).toBe('9 أسابيع تمامًا')
  })
})

describe('ثبات الرقم خلال اليوم الواحد', () => {
  it('لا يتغيّر عمر الحمل بتغيّر ساعة فتح التطبيق', () => {
    // التواريخ تُخزَّن عند منتصف النهار، فكان الرقم يقفز ظهرًا:
    // «٢٨+٤» صباحًا و«٢٨+٥» عصرًا من اليوم نفسه.
    const lmp = new Date(2026, 0, 1, 12, 0, 0).toISOString()
    const at = (hour: number) => {
      const p = getPregnancyProgress(lmp, null, new Date(2026, 6, 21, hour, 0, 0))!
      return `${p.week}+${p.dayOfWeek}`
    }
    const readings = [at(0), at(9), at(11), at(13), at(23)]
    expect(new Set(readings).size).toBe(1)
    expect(readings[0]).toBe('28+5')
  })

  it('ينتقل يومًا واحدًا عند منتصف الليل لا قبله', () => {
    const lmp = new Date(2026, 0, 1, 12, 0, 0).toISOString()
    const lateTonight = getPregnancyProgress(lmp, null, new Date(2026, 6, 21, 23, 59, 0))!
    const justAfterMidnight = getPregnancyProgress(lmp, null, new Date(2026, 6, 22, 0, 1, 0))!
    expect(justAfterMidnight.totalDays).toBe(lateTonight.totalDays + 1)
  })
})

describe('موعد الولادة المشتقّ', () => {
  it('يشتقّه من آخر دورة حين لا يُدخَل صراحةً — ٢٨٠ يومًا', () => {
    const lmp = new Date(2026, 0, 1, 12).toISOString()
    const p = getPregnancyProgress(lmp, null, new Date(2026, 2, 1, 12))!
    const days = Math.round((new Date(p.due).getTime() - new Date(lmp).getTime()) / 86400000)
    expect(days).toBe(280)
  })

  it('يحترم الموعد المُدخَل حين يخالف حساب آخر دورة', () => {
    // الطبيبة قد تعدّل الموعد بناءً على قياس السونار
    const lmp = new Date(2026, 0, 1, 12).toISOString()
    const due = new Date(2026, 9, 20, 12).toISOString()
    const p = getPregnancyProgress(lmp, due, new Date(2026, 2, 1, 12))!
    expect(p.due).toBe(due)
  })
})
