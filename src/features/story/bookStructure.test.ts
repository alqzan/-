import { describe, expect, it } from 'vitest'
import { bookAgeLabel, groupByPart, partOf } from './bookStructure'

const BORN = '2026-03-10T08:00:00.000Z'

describe('أجزاء الكتاب', () => {
  it('قبل الولادة أو بلا تاريخ ولادة: جزء الحمل', () => {
    expect(partOf(null, new Date('2026-01-01')).key).toBe('pregnancy')
    expect(partOf(BORN, new Date('2026-02-20')).key).toBe('pregnancy')
  })

  it('شهر الولادة وما بعده حتى ١٢ شهرًا: السنة الأولى، ثم الثانية والثالثة', () => {
    expect(partOf(BORN, new Date('2026-03-12')).title).toBe('السنة الأولى')
    expect(partOf(BORN, new Date('2027-02-20')).title).toBe('السنة الأولى')
    expect(partOf(BORN, new Date('2027-03-15')).title).toBe('السنة الثانية')
    expect(partOf(BORN, new Date('2028-06-01')).title).toBe('السنة الثالثة')
    expect(partOf(BORN, new Date('2041-06-01')).title).toBe('السنة السادسة عشرة')
  })

  it('يرتّب الأجزاء زمنيًا ويحفظ ترتيب عناصر كل جزء', () => {
    const items = [
      { date: '2028-04-01T00:00:00.000Z', n: 4 },
      { date: '2026-04-01T00:00:00.000Z', n: 2 },
      { date: '2026-01-15T00:00:00.000Z', n: 1 },
      { date: '2027-05-01T00:00:00.000Z', n: 3 },
    ]
    const groups = groupByPart(items, BORN)
    expect(groups.map((g) => g.part.key)).toEqual(['pregnancy', 'year-00', 'year-01', 'year-02'])
    expect(groups.flatMap((g) => g.items.map((i) => i.n))).toEqual([1, 2, 3, 4])
  })
})

describe('عمر الغلاف', () => {
  const at = (iso: string) => bookAgeLabel(BORN, new Date(iso))
  it('أيام ثم أشهر ثم سنوات وأشهر', () => {
    expect(at('2026-03-30T08:00:00.000Z')).toContain('يومًا')
    expect(at('2026-08-15T08:00:00.000Z')).toContain('أشهر')
    expect(at('2028-03-12T08:00:00.000Z')).toBe('سنتان')
    expect(at('2028-06-12T08:00:00.000Z')).toBe('سنتان و3 أشهر')
  })
})
