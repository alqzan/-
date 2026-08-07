import { describe, expect, it } from 'vitest'
import {
  asNeededLogsOn,
  dayDiff,
  dayPlan,
  dayProgress,
  isMedActiveOn,
  isMedDueOn,
  isOverdue,
  nextDose,
  scheduleLabel,
  shiftDay,
  weekdayOf,
} from './meds'
import type { MedDoseLog, Medication } from '../data/types'

// =============================================================
// جدول الأدوية.
//
// خطأ هنا ليس خطأً تجميليًا: جرعة تظهر في اليوم الخطأ تعني دواءً يُؤخذ
// مرتين أو لا يُؤخذ أصلًا. لذلك تحرس هذه الاختبارات الحالات التي تنزلق
// عادةً — «يوم بعد يوم» عبر التوقيت الصيفي، وحدود يومَي البداية والنهاية.
// =============================================================

function med(patch: Partial<Medication> = {}): Medication {
  return {
    id: 'm1',
    name: 'حديد',
    form: 'pill',
    frequency: 'daily',
    times: ['08:00', '20:00'],
    startDate: '2026-08-01',
    endDate: null,
    who: 'mom',
    archived: false,
    createdAt: '2026-08-01T09:00:00.000Z',
    ...patch,
  }
}

function log(patch: Partial<MedDoseLog> = {}): MedDoseLog {
  return {
    id: 'l1',
    medId: 'm1',
    day: '2026-08-05',
    time: '08:00',
    takenAt: '2026-08-05T05:10:00.000Z',
    ...patch,
  }
}

describe('حساب الأيام', () => {
  it('يحسب فرق الأيام بين مفتاحي يوم', () => {
    expect(dayDiff('2026-08-05', '2026-08-01')).toBe(4)
    expect(dayDiff('2026-08-01', '2026-08-05')).toBe(-4)
    expect(dayDiff('2026-08-01', '2026-08-01')).toBe(0)
  })

  it('يعبر حدود الشهر والسنة بلا انزياح', () => {
    expect(dayDiff('2026-09-01', '2026-08-31')).toBe(1)
    expect(dayDiff('2027-01-01', '2026-12-31')).toBe(1)
    // سنة كبيسة: فبراير ٢٩ موجود في ٢٠٢٨
    expect(dayDiff('2028-03-01', '2028-02-28')).toBe(2)
  })

  it('يُزيح اليوم بعدد أيام موجب أو سالب', () => {
    expect(shiftDay('2026-08-31', 1)).toBe('2026-09-01')
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('يعرف يوم الأسبوع', () => {
    // ٢٠٢٦-٠٨-٠٢ يوم أحد
    expect(weekdayOf('2026-08-02')).toBe(0)
    expect(weekdayOf('2026-08-07')).toBe(5)
  })
})

describe('isMedActiveOn — حدود السريان', () => {
  it('يبدأ من يوم البداية نفسه لا بعده', () => {
    const m = med({ startDate: '2026-08-01' })
    expect(isMedActiveOn(m, '2026-07-31')).toBe(false)
    expect(isMedActiveOn(m, '2026-08-01')).toBe(true)
  })

  it('يشمل يوم النهاية ثم يتوقّف', () => {
    const m = med({ endDate: '2026-08-10' })
    expect(isMedActiveOn(m, '2026-08-10')).toBe(true)
    expect(isMedActiveOn(m, '2026-08-11')).toBe(false)
  })

  it('الدواء الموقوف لا يسري ولو كان داخل مدّته', () => {
    expect(isMedActiveOn(med({ archived: true }), '2026-08-05')).toBe(false)
  })
})

describe('isMedDueOn — أنماط التكرار', () => {
  it('اليومي يُستحقّ كل يوم داخل المدّة', () => {
    const m = med({ frequency: 'daily' })
    expect(isMedDueOn(m, '2026-08-01')).toBe(true)
    expect(isMedDueOn(m, '2026-08-02')).toBe(true)
    expect(isMedDueOn(m, '2026-07-31')).toBe(false)
  })

  it('«يوم بعد يوم» يُستحقّ في أيام البداية الزوجية فقط', () => {
    const m = med({ frequency: 'everyNDays', everyDays: 2, startDate: '2026-08-01' })
    expect(isMedDueOn(m, '2026-08-01')).toBe(true)
    expect(isMedDueOn(m, '2026-08-02')).toBe(false)
    expect(isMedDueOn(m, '2026-08-03')).toBe(true)
    expect(isMedDueOn(m, '2026-08-04')).toBe(false)
  })

  it('«يوم بعد يوم» يبقى ثابتًا بعد شهر من البداية', () => {
    const m = med({ frequency: 'everyNDays', everyDays: 2, startDate: '2026-08-01' })
    // بين ١ أغسطس و١ أكتوبر ٦١ يومًا (فردي) فلا يُستحقّ، ويُستحقّ الذي بعده
    expect(isMedDueOn(m, '2026-10-01')).toBe(false)
    expect(isMedDueOn(m, '2026-10-02')).toBe(true)
  })

  it('كل ٣ أيام يحسب من يوم البداية', () => {
    const m = med({ frequency: 'everyNDays', everyDays: 3, startDate: '2026-08-01' })
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => isMedDueOn(m, `2026-08-0${d}`))).toEqual([
      true, false, false, true, false, false, true,
    ])
  })

  it('أيام الأسبوع المحدّدة تُستحقّ في أيامها فقط', () => {
    // الأحد والأربعاء
    const m = med({ frequency: 'weekdays', weekdays: [0, 3] })
    expect(isMedDueOn(m, '2026-08-02')).toBe(true) // أحد
    expect(isMedDueOn(m, '2026-08-05')).toBe(true) // أربعاء
    expect(isMedDueOn(m, '2026-08-06')).toBe(false) // خميس
  })

  it('«عند اللزوم» لا يُستحقّ في أي يوم', () => {
    const m = med({ frequency: 'asNeeded', times: [] })
    expect(isMedDueOn(m, '2026-08-01')).toBe(false)
    expect(isMedDueOn(m, '2026-08-02')).toBe(false)
  })
})

describe('dayPlan — جرعات اليوم', () => {
  const iron = med({ id: 'iron', name: 'حديد', times: ['08:00', '14:00', '20:00'] })
  const pessary = med({
    id: 'pes',
    name: 'تحميلة',
    form: 'suppository',
    frequency: 'everyNDays',
    everyDays: 2,
    times: ['21:00'],
    startDate: '2026-08-01',
  })

  it('يجمع جرعات كل الأدوية المستحقّة مرتّبةً بالوقت', () => {
    const slots = dayPlan([iron, pessary], [], '2026-08-05')
    expect(slots.map((s) => s.time)).toEqual(['08:00', '14:00', '20:00', '21:00'])
  })

  it('يُسقط الدواء غير المستحقّ في ذلك اليوم', () => {
    const slots = dayPlan([iron, pessary], [], '2026-08-06')
    expect(slots.map((s) => s.med.id)).toEqual(['iron', 'iron', 'iron'])
  })

  it('يربط كل جرعة بسجلّها إن وُجد ويتجاهل سجلّات الأيام الأخرى', () => {
    const logs = [
      log({ id: 'a', medId: 'iron', day: '2026-08-05', time: '08:00' }),
      log({ id: 'b', medId: 'iron', day: '2026-08-04', time: '14:00' }),
    ]
    const slots = dayPlan([iron], logs, '2026-08-05')
    expect(slots.find((s) => s.time === '08:00')!.log?.id).toBe('a')
    expect(slots.find((s) => s.time === '14:00')!.log).toBeNull()
  })

  it('يتجاهل الأدوية الموقوفة تمامًا', () => {
    expect(dayPlan([med({ archived: true })], [], '2026-08-05')).toHaveLength(0)
  })
})

describe('dayProgress', () => {
  const m = med({ times: ['08:00', '14:00', '20:00'] })

  it('يفصل المأخوذ عن المتخطّى عن المتبقّي', () => {
    const logs = [
      log({ id: 'a', time: '08:00' }),
      log({ id: 'b', time: '14:00', skipped: true }),
    ]
    const p = dayProgress(dayPlan([m], logs, '2026-08-05'))
    expect(p).toMatchObject({ taken: 1, skipped: 1, remaining: 1, total: 3 })
  })

  it('يعتبر اليوم الخالي من الجرعات مكتملًا لا فارغًا', () => {
    expect(dayProgress([]).ratio).toBe(1)
  })
})

describe('المتأخّر والقادم', () => {
  const m = med({ times: ['08:00', '14:00', '20:00'] })
  const noon = new Date('2026-08-05T12:00:00')

  it('الجرعة التي فات وقتها اليوم ولم تُسجَّل متأخّرة', () => {
    const slots = dayPlan([m], [], '2026-08-05')
    expect(isOverdue(slots[0], noon)).toBe(true) // ٨:٠٠
    expect(isOverdue(slots[1], noon)).toBe(false) // ٢:٠٠ لم يحن بعد
  })

  it('الجرعة المسجّلة لا تكون متأخّرة أبدًا', () => {
    const slots = dayPlan([m], [log({ time: '08:00' })], '2026-08-05')
    expect(isOverdue(slots[0], noon)).toBe(false)
  })

  it('كل جرعات الأمس غير المسجّلة متأخّرة', () => {
    const slots = dayPlan([m], [], '2026-08-04')
    expect(slots.every((s) => isOverdue(s, noon))).toBe(true)
  })

  it('تُقدَّم الجرعة المتأخّرة على القادمة', () => {
    const slots = dayPlan([m], [], '2026-08-05')
    expect(nextDose(slots, noon)!.time).toBe('08:00')
  })

  it('بعد تسجيل المتأخّرة تصبح القادمة هي المطلوبة', () => {
    const slots = dayPlan([m], [log({ time: '08:00' })], '2026-08-05')
    expect(nextDose(slots, noon)!.time).toBe('14:00')
  })

  it('يرجع null حين تُسجَّل كل الجرعات', () => {
    const logs = ['08:00', '14:00', '20:00'].map((time, i) => log({ id: `l${i}`, time }))
    expect(nextDose(dayPlan([m], logs, '2026-08-05'), noon)).toBeNull()
  })
})

describe('asNeededLogsOn', () => {
  it('يعرض جرعات «عند اللزوم» ليومها فقط، الأحدث أولًا', () => {
    const prn = med({ id: 'pain', name: 'مسكّن', frequency: 'asNeeded', times: [] })
    const logs = [
      log({ id: 'x', medId: 'pain', time: '', takenAt: '2026-08-05T06:00:00.000Z' }),
      log({ id: 'y', medId: 'pain', time: '', takenAt: '2026-08-05T15:00:00.000Z' }),
      log({ id: 'z', medId: 'pain', day: '2026-08-04', time: '' }),
    ]
    expect(asNeededLogsOn([prn], logs, '2026-08-05').map((r) => r.log.id)).toEqual(['y', 'x'])
  })
})

describe('scheduleLabel', () => {
  it('يصف التكرار اليومي بعدد مرّاته', () => {
    expect(scheduleLabel(med({ times: ['08:00'] }))).toBe('مرة يوميًا')
    expect(scheduleLabel(med({ times: ['08:00', '20:00'] }))).toBe('مرتين يوميًا')
    expect(scheduleLabel(med({ times: ['08:00', '14:00', '20:00'] }))).toBe('3 مرات يوميًا')
  })

  it('يصف «يوم بعد يوم» بعبارته المعتادة', () => {
    const m = med({ frequency: 'everyNDays', everyDays: 2, times: ['21:00'] })
    expect(scheduleLabel(m)).toBe('يوم بعد يوم')
    expect(scheduleLabel({ ...m, everyDays: 3 })).toBe('كل 3 أيام')
  })

  it('يصف «عند اللزوم» والأيام المحدّدة', () => {
    expect(scheduleLabel(med({ frequency: 'asNeeded', times: [] }))).toBe('عند اللزوم')
    expect(scheduleLabel(med({ frequency: 'weekdays', weekdays: [0, 3], times: ['09:00'] }))).toBe(
      'الأحد، الأربعاء',
    )
  })
})
