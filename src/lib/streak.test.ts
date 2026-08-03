import { describe, expect, it } from 'vitest'
import { documentationStreak } from './streak'

// الأربعاء ١٥ يوليو ٢٠٢٦ الساعة ١٢ ظهرًا بتوقيت الجهاز
const NOW = new Date(2026, 6, 15, 12, 0, 0)
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString()

describe('documentationStreak', () => {
  it('يرجع صفرًا حين لا يوجد توثيق', () => {
    const s = documentationStreak([], NOW)
    expect(s.weeks).toBe(0)
    expect(s.best).toBe(0)
    expect(s.daysSince).toBeNull()
    expect(s.recentWeeks).toHaveLength(8)
  })

  it('يعدّ الأسابيع المتتالية شاملةً الأسبوع الحالي', () => {
    const s = documentationStreak([daysAgo(0), daysAgo(8), daysAgo(15)], NOW)
    expect(s.weeks).toBe(3)
  })

  it('الأسبوع الحالي الفارغ لا يكسر السلسلة', () => {
    // آخر توثيق الأسبوع الماضي فقط — ما زال أمامهم بقية هذا الأسبوع
    const s = documentationStreak([daysAgo(8), daysAgo(15)], NOW)
    expect(s.weeks).toBe(2)
  })

  it('الانقطاع أسبوعًا كاملًا يكسر السلسلة', () => {
    const s = documentationStreak([daysAgo(0), daysAgo(21)], NOW)
    expect(s.weeks).toBe(1)
  })

  it('عدّة عناصر في الأسبوع نفسه تُحتسب أسبوعًا واحدًا', () => {
    const s = documentationStreak([daysAgo(0), daysAgo(1), daysAgo(2)], NOW)
    expect(s.weeks).toBe(1)
  })

  it('يحفظ أطول سلسلة حتى بعد الانقطاع', () => {
    const old = [daysAgo(60), daysAgo(67), daysAgo(74), daysAgo(81)]
    const s = documentationStreak([...old, daysAgo(0)], NOW)
    expect(s.weeks).toBe(1)
    expect(s.best).toBe(4)
  })

  it('يحسب الأيام منذ آخر توثيق ويتجاهل تواريخ المستقبل', () => {
    const future = new Date(NOW.getTime() + 5 * 86400000).toISOString()
    const s = documentationStreak([future, daysAgo(3)], NOW)
    expect(s.daysSince).toBe(3)
  })

  it('يصف آخر ثمانية أسابيع بالترتيب من الأقدم للأحدث', () => {
    const s = documentationStreak([daysAgo(0)], NOW)
    expect(s.recentWeeks[7]).toBe(true)
    expect(s.recentWeeks.slice(0, 7).every((w) => w === false)).toBe(true)
  })
})
