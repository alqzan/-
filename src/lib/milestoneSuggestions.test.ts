import { describe, expect, it } from 'vitest'
import { MILESTONE_SUGGESTIONS, suggestionsForAge } from './milestoneSuggestions'

describe('اقتراحات المحطات حسب العمر', () => {
  it('تناسب العمر وتستثني ما سُجّل، وتحترم الحد', () => {
    const at18 = suggestionsForAge(18, [], 50)
    expect(at18.length).toBeGreaterThan(3)
    for (const s of at18) {
      expect(s.from).toBeLessThanOrEqual(18)
      expect(s.to).toBeGreaterThanOrEqual(18)
    }
    expect(suggestionsForAge(18, [at18[0]!.title], 50).map((s) => s.title)).not.toContain(at18[0]!.title)
    expect(suggestionsForAge(18, [], 2)).toHaveLength(2)
  })

  it('كل شهر من ٢ إلى ٣٦ له اقتراح على الأقل، والعناوين فريدة', () => {
    for (let m = 2; m <= 36; m++) expect(suggestionsForAge(m, [], 99).length, `الشهر ${m}`).toBeGreaterThan(0)
    const titles = MILESTONE_SUGGESTIONS.map((s) => s.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
