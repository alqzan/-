import { describe, expect, it } from 'vitest'
import { promptOfTheDay, promptsForToday } from './prompts'

const DAY = new Date('2026-06-15T09:00:00.000Z')

describe('promptsForToday', () => {
  it('أولى الأفكار هي سؤال الرئيسية نفسه', () => {
    expect(promptsForToday(false, DAY)[0]).toBe(promptOfTheDay(false, DAY))
    expect(promptsForToday(true, DAY)[0]).toBe(promptOfTheDay(true, DAY))
  })

  // اليوم هنا يوم الوالدين المحلّي لا يوم UTC — والاختبارات مثبّتة على الرياض
  it('تبقى الأفكار نفسها خلال اليوم الواحد', () => {
    const morning = promptsForToday(false, new Date('2026-06-15T01:00:00.000+03:00'))
    const night = promptsForToday(false, new Date('2026-06-15T23:30:00.000+03:00'))
    expect(night).toEqual(morning)
  })

  it('تتبدّل الأفكار مع تبدّل اليوم', () => {
    const today = promptsForToday(false, DAY)
    const tomorrow = promptsForToday(false, new Date('2026-06-16T09:00:00.000Z'))
    expect(tomorrow).not.toEqual(today)
  })

  it('ثلاث أفكار بلا تكرار — في كل أيام السنة ولكل مرحلة', () => {
    for (const born of [false, true]) {
      for (let d = 0; d < 366; d++) {
        const day = new Date(2026, 0, 1 + d)
        const ideas = promptsForToday(born, day)
        expect(ideas).toHaveLength(3)
        expect(new Set(ideas).size, `اليوم ${d}`).toBe(3)
      }
    }
  })

  it('تختلف الأفكار قبل الولادة عنها بعدها', () => {
    const before = promptsForToday(false, DAY)
    const after = promptsForToday(true, DAY)
    for (const idea of after) expect(before).not.toContain(idea)
  })
})
