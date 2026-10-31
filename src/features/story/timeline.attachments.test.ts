import { describe, expect, it } from 'vitest'
import { migrate } from '../../data/migrate'
import { emptyData } from '../../data/seed'
import type { AppData } from '../../data/types'
import { buildStory, filterStory, sameDayItems } from './timeline'

const NOW = new Date('2026-10-31T12:00:00.000Z')
const base = (): AppData => {
  const d = emptyData()
  d.journal = [{ id: 'j1', text: 'زيارة المستشفى', date: '2026-10-20T10:00:00.000Z', author: 'mom' }]
  d.photos = [
    { id: 'p1', dataUrl: 'data:image/png;base64,AA', date: '2026-10-20T10:05:00.000Z', author: 'mom' },
  ]
  d.voices = [
    { id: 'v1', localKey: 'k1', durationSec: 4, date: '2026-10-20T10:06:00.000Z', author: 'dad' },
  ]
  return d
}
const keys = (d: AppData) => buildStory(d, NOW).map((i) => i.key).sort()

describe('ذكرى تجمع نصًا وصورة وصوتًا — توافق وأمان البيانات', () => {
  it('بيانات قديمة بلا memoryId تُعرض عناصر مستقلة كما كانت تمامًا', () => {
    expect(keys(base())).toEqual(
      expect.arrayContaining(['letter:j1', 'photo:p1', 'voice:v1']),
    )
    const letter = buildStory(base(), NOW).find((i) => i.key === 'letter:j1')!
    expect(letter.attachments).toBeUndefined()
  })

  it('الوسائط المربوطة بذكرى موجودة تُعرض داخلها وتبقى كلها في البيانات', () => {
    const d = base()
    d.photos[0]!.memoryId = 'j1'
    d.voices[0]!.memoryId = 'j1'
    const story = buildStory(d, NOW)
    expect(story.map((i) => i.key)).not.toContain('photo:p1')
    expect(story.map((i) => i.key)).not.toContain('voice:v1')
    const letter = story.find((i) => i.key === 'letter:j1')!
    expect(letter.attachments?.photos.map((p) => p.id)).toEqual(['p1'])
    expect(letter.attachments?.voices.map((v) => v.id)).toEqual(['v1'])
    expect(d.photos).toHaveLength(1)
    expect(d.voices).toHaveLength(1)
    // تظهر الذكرى أيضًا تحت مرشّحَي الصور والصوت
    expect(filterStory(story, 'photo').map((i) => i.key)).toContain('letter:j1')
    expect(filterStory(story, 'voice').map((i) => i.key)).toContain('letter:j1')
  })

  it('حذف الذكرى أو غيابها عن الجهاز يُعيد الوسيطة مستقلة ولا يُفقدها', () => {
    const d = base()
    d.photos[0]!.memoryId = 'j1'
    d.voices[0]!.memoryId = 'j1'
    d.journal = []
    expect(keys(d)).toEqual(expect.arrayContaining(['photo:p1', 'voice:v1']))
  })

  it('النسخ الاحتياطي والاستعادة يحفظان الربط، والبيانات القديمة لا تكتسب حقولًا', () => {
    const d = base()
    d.photos[0]!.memoryId = 'j1'
    const restored = migrate(JSON.parse(JSON.stringify(d)))!
    expect(restored.photos[0]!.memoryId).toBe('j1')
    expect(restored.voices[0]!.memoryId).toBeUndefined()
    const old = migrate(JSON.parse(JSON.stringify(base())))!
    expect(old.photos[0]!.memoryId).toBeUndefined()
    expect(old.photos).toHaveLength(1)
    expect(old.voices).toHaveLength(1)
  })

  it('ذكريات اليوم نفسه اقتراح للعرض فقط ولا تغيّر البيانات', () => {
    const d = base()
    d.milestones = [{ id: 'm1', title: 'أول سونار', achievedAt: '2026-10-20T09:00:00.000Z' }] as AppData['milestones']
    const before = JSON.stringify(d)
    const story = buildStory(d, NOW)
    const ms = story.find((i) => i.key === 'milestone:m1')!
    expect(sameDayItems(story, ms).map((i) => i.key)).toEqual(
      expect.arrayContaining(['letter:j1', 'photo:p1', 'voice:v1']),
    )
    expect(sameDayItems(story, ms).map((i) => i.key)).not.toContain('milestone:m1')
    expect(JSON.stringify(d)).toBe(before)
  })
})
