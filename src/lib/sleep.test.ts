import { describe, expect, it } from 'vitest'
import { napsOn, sleepMinutesOn } from './sleep'

const night = { id: 'n', startedAt: new Date(2026, 5, 14, 21, 0).toISOString(), endedAt: new Date(2026, 5, 15, 6, 0).toISOString() }
const nap = { id: 'p', startedAt: new Date(2026, 5, 15, 13, 0).toISOString(), endedAt: new Date(2026, 5, 15, 14, 30).toISOString() }
const running = { id: 'r', startedAt: new Date(2026, 5, 15, 20, 0).toISOString(), endedAt: null }

describe('نوم اليوم', () => {
  it('نوم الليل يوزَّع على يومَيه، لا يُنسب كله لليوم السابق', () => {
    const day15 = new Date(2026, 5, 15, 12)
    const day14 = new Date(2026, 5, 14, 12)
    expect(sleepMinutesOn([night], day14)).toBe(180)
    expect(sleepMinutesOn([night], day15)).toBe(360)
    expect(sleepMinutesOn([night, nap], day15)).toBe(450)
  })

  it('النومة الجارية لا تُحسب، والغفوات تستثني نوم الليل', () => {
    const day15 = new Date(2026, 5, 15, 12)
    expect(sleepMinutesOn([running], day15)).toBe(0)
    expect(napsOn([night, nap, running], day15)).toBe(1)
  })
})
