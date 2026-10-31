import { beforeEach, describe, expect, it } from 'vitest'
import { TRACK_PREFS_KEY, parseHidden, resetTrackPrefsForTests, setToolHidden } from './trackPrefs'

beforeEach(() => {
  localStorage.clear()
  resetTrackPrefsForTests()
})

describe('trackPrefs', () => {
  it('يتجاهل المحتوى التالف والأدوات غير المعروفة (ولا يسمح بإخفاء الأدوية)', () => {
    expect(parseHidden('{oops')).toEqual([])
    expect(parseHidden(JSON.stringify({ hidden: ['kicks', 'meds', 7, 'kicks'] }))).toEqual(['kicks'])
  })

  it('الإخفاء والإعادة يُحفظان على الجهاز ولا يمسّان مفتاح البيانات', () => {
    localStorage.setItem('tafalna:v2', 'DATA')
    setToolHidden('kicks', true)
    expect(JSON.parse(localStorage.getItem(TRACK_PREFS_KEY)!)).toEqual({ hidden: ['kicks'] })
    setToolHidden('kicks', false)
    expect(JSON.parse(localStorage.getItem(TRACK_PREFS_KEY)!)).toEqual({ hidden: [] })
    expect(localStorage.getItem('tafalna:v2')).toBe('DATA')
  })
})
