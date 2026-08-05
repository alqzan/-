import { describe, expect, it } from 'vitest'
import { emptyData } from '../../data/seed'
import { buildStory, chapterize, filterStory, searchStory, stageLabel } from './timeline'
import type { AppData } from '../../data/types'

function makeData(patch: Partial<AppData> = {}): AppData {
  return { ...emptyData(), ...patch }
}

const NOW = new Date('2026-06-15T12:00:00.000Z')

describe('buildStory', () => {
  it('يجمع الأنواع كلها في خيط واحد مرتّب من الأحدث إلى الأقدم', () => {
    const data = makeData({
      photos: [
        { id: 'p1', dataUrl: 'x', date: '2026-03-01T12:00:00.000Z', author: 'mom' },
      ],
      journal: [
        { id: 'j1', text: 'رسالة', date: '2026-05-01T12:00:00.000Z', author: 'dad' },
      ],
      milestones: [
        { id: 'm1', title: 'أول ابتسامة', emoji: '', achievedAt: '2026-04-01T12:00:00.000Z', builtIn: true },
        { id: 'm2', title: 'أول خطوة', emoji: '', achievedAt: null, builtIn: true },
      ],
    })

    const items = buildStory(data, NOW)

    expect(items.map((i) => i.key)).toEqual(['letter:j1', 'milestone:m1', 'photo:p1'])
  })

  it('يستبعد المعالم غير المتحقّقة والمواعيد القادمة', () => {
    const data = makeData({
      appointments: [
        {
          id: 'a1',
          title: 'موعد قادم',
          dateTime: '2026-07-01T12:00:00.000Z',
          type: 'checkup',
        },
        {
          id: 'a2',
          title: 'موعد ماضٍ',
          dateTime: '2026-05-20T12:00:00.000Z',
          type: 'ultrasound',
        },
      ],
    })

    const items = buildStory(data, NOW)
    expect(items.map((i) => i.id)).toEqual(['a2'])
  })

  it('يقفل الكبسولة التي لم يحن موعدها ولا يكشف نصّها', () => {
    const data = makeData({
      capsules: [
        {
          id: 'c1',
          title: 'إلى ابننا',
          message: 'سرّ لا يُقرأ الآن',
          author: 'mom',
          openAt: '2030-01-01T12:00:00.000Z',
          createdAt: '2026-05-01T12:00:00.000Z',
          isOpened: false,
        },
      ],
    })

    const [capsule] = buildStory(data, NOW)
    expect(capsule.locked).toBe(true)
    expect(capsule.body).toBeUndefined()
    // مكانها في الخيط هو يوم كتابتها لا يوم فتحها
    expect(capsule.date).toBe('2026-05-01T12:00:00.000Z')
  })

  it('يضيف يوم الولادة كعنصر في الحكاية', () => {
    const base = emptyData()
    const data = makeData({
      child: { ...base.child, name: 'ياسين', bornAt: '2026-02-02T09:00:00.000Z' },
    })

    const items = buildStory(data, NOW)
    expect(items.some((i) => i.kind === 'birth' && i.title?.includes('ياسين'))).toBe(true)
  })
})

describe('filterStory', () => {
  const items = buildStory(
    makeData({
      photos: [{ id: 'p1', dataUrl: 'x', date: '2026-03-01T12:00:00.000Z', author: 'mom' }],
      journal: [{ id: 'j1', text: 'رسالة', date: '2026-05-01T12:00:00.000Z', author: 'dad' }],
    }),
    NOW,
  )

  it('«الكل» يرجع كل شيء', () => {
    expect(filterStory(items, 'all')).toHaveLength(2)
  })

  it('فلتر الصور يرجع الصور وحدها', () => {
    expect(filterStory(items, 'photo').map((i) => i.kind)).toEqual(['photo'])
  })
})

describe('searchStory', () => {
  it('يبحث في النص والعنوان', () => {
    const items = buildStory(
      makeData({
        journal: [
          { id: 'j1', title: 'أول ركلة', text: 'حسّيت فيك', date: '2026-05-01T12:00:00.000Z', author: 'mom' },
          { id: 'j2', text: 'كلام ثاني', date: '2026-05-02T12:00:00.000Z', author: 'dad' },
        ],
      }),
      NOW,
    )
    expect(searchStory(items, 'ركلة').map((i) => i.id)).toEqual(['j1'])
    expect(searchStory(items, '  ').map((i) => i.id)).toHaveLength(2)
  })

  it('يتجاهل التشكيل وصور الهمزة والتاء المربوطة', () => {
    const items = buildStory(
      makeData({
        journal: [
          {
            id: 'j1',
            title: 'أوّل ابتسامة',
            text: 'ضَحِكَ اليوم',
            date: '2026-05-01T12:00:00.000Z',
            author: 'mom',
          },
        ],
      }),
      NOW,
    )

    // ألف بلا همزة، وتشكيل مفقود، وتاء مربوطة مكتوبة هاءً — كلها يجب أن تجد الذكرى
    for (const q of ['اول', 'أول', 'ابتسامه', 'ضحك', 'ابتسامة']) {
      expect(searchStory(items, q).map((i) => i.id), `البحث عن «${q}»`).toEqual(['j1'])
    }
    expect(searchStory(items, 'خطوة')).toHaveLength(0)
  })
})

describe('chapterize', () => {
  it('يقسّم إلى فصول شهرية من الأحدث للأقدم', () => {
    const data = makeData({
      journal: [
        { id: 'j1', text: 'أ', date: '2026-03-05T12:00:00.000Z', author: 'mom' },
        { id: 'j2', text: 'ب', date: '2026-03-20T12:00:00.000Z', author: 'mom' },
        { id: 'j3', text: 'ج', date: '2026-05-02T12:00:00.000Z', author: 'dad' },
      ],
    })
    const chapters = chapterize(buildStory(data, NOW), data.child)

    expect(chapters.map((c) => c.key)).toEqual(['2026-05', '2026-03'])
    expect(chapters[1].items).toHaveLength(2)
    expect(chapters[0].title).toContain('مايو')
  })
})

describe('stageLabel', () => {
  it('يصف أسبوع الحمل قبل الولادة', () => {
    const base = emptyData()
    const child = { ...base.child, dueDate: '2026-09-01T12:00:00.000Z' }
    expect(stageLabel(child, new Date('2026-06-15T12:00:00.000Z'))).toMatch(/الأسبوع \d+ من الحمل/)
  })

  it('يصف عمر الطفل بالأشهر بعد الولادة', () => {
    const base = emptyData()
    const child = { ...base.child, bornAt: '2026-01-10T12:00:00.000Z' }
    expect(stageLabel(child, new Date('2026-01-20T12:00:00.000Z'))).toBe('شهر الولادة')
    expect(stageLabel(child, new Date('2026-02-15T12:00:00.000Z'))).toBe('الشهر الأول')
    expect(stageLabel(child, new Date('2027-01-15T12:00:00.000Z'))).toBe('السنة الأولى')
  })

  it('يستعمل أسماء الأشهر لا أرقامها، ويصرّف السنين والأشهر عربيًا', () => {
    const base = emptyData()
    const child = { ...base.child, bornAt: '2026-01-10T12:00:00.000Z' }

    expect(stageLabel(child, new Date('2026-04-15T12:00:00.000Z'))).toBe('الشهر الثالث')
    expect(stageLabel(child, new Date('2026-12-15T12:00:00.000Z'))).toBe('الشهر الحادي عشر')
    // سنة وثلاثة أشهر — لا «1 سنة و3 شهر»
    expect(stageLabel(child, new Date('2027-04-15T12:00:00.000Z'))).toBe('سنة و3 أشهر')
    expect(stageLabel(child, new Date('2028-01-15T12:00:00.000Z'))).toBe('سنتان')
  })
})
