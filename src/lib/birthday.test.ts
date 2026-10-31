import { describe, expect, it } from 'vitest'
import { nextBirthday } from './birthday'

const BORN = new Date(2026, 2, 10, 8).toISOString()

describe('عيد الميلاد', () => {
  it('لا عيد قبل أن يكمل الطفل سنة', () => {
    expect(nextBirthday(BORN, new Date(2026, 8, 1))).toEqual({ turning: 1, daysLeft: 190 })
    expect(nextBirthday(null)).toBeNull()
  })

  it('يحسب الأيام المتبقية ويوم العيد نفسه صفر، وبعده يتجه للسنة التالية', () => {
    expect(nextBirthday(BORN, new Date(2027, 2, 3))).toEqual({ turning: 1, daysLeft: 7 })
    expect(nextBirthday(BORN, new Date(2027, 2, 10, 20))).toEqual({ turning: 1, daysLeft: 0 })
    expect(nextBirthday(BORN, new Date(2027, 2, 11))?.turning).toBe(2)
  })

  it('٢٩ فبراير يُحتفل به ٢٨ فبراير في السنوات العادية', () => {
    const leapBorn = new Date(2024, 1, 29, 8).toISOString()
    expect(nextBirthday(leapBorn, new Date(2027, 1, 20))).toEqual({ turning: 3, daysLeft: 8 })
  })
})
