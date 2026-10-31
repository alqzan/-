import { describe, expect, it } from 'vitest'
import type { Milestone } from '../../data/types'
import { lifeEventPresets } from './LifeEvents'

const completed = (id: string, title: string): Milestone => ({
  id,
  title,
  emoji: '',
  achievedAt: '2026-08-14T12:00:00.000Z',
  builtIn: false,
})

describe('اقتراحات المحطات الكبيرة', () => {
  it('يعرض أحداث الحمل قبل الولادة وأحداث النمو بعدها', () => {
    expect(lifeEventPresets('pregnancy', []).map((item) => item.title)).toEqual([
      'أول سونار',
      'معرفة جنس الجنين',
    ])
    expect(lifeEventPresets('child', []).map((item) => item.title)).toEqual([
      'أول خطوة',
      'عيد ميلاد',
    ])
    expect(lifeEventPresets('child', [], true).map((item) => item.title)).toEqual([
      'أول خطوة',
      'عيد ميلاد',
      'أول سونار',
      'معرفة جنس الجنين',
    ])
  })

  it('يخفي اقتراح الحدث المسجّل، ويترك محطات أعياد الميلاد المتكررة', () => {
    const presets = lifeEventPresets('child', [
      completed('step', 'أول خطوة'),
      completed('birthday', 'عيد ميلاد'),
    ])

    expect(presets.map((item) => item.title)).toEqual(['عيد ميلاد'])
  })

  it('لا يخفي المحطة لمجرد وجود قالب غير متحقق لها', () => {
    const unfinished: Milestone = {
      id: 'step',
      title: 'أول خطوة',
      emoji: '',
      achievedAt: null,
      builtIn: true,
    }

    expect(lifeEventPresets('child', [unfinished]).map((item) => item.title)).toContain('أول خطوة')
  })
})
