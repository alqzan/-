import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { DATA_VERSION, builtInVaccines, emptyData } from './seed'

// أهم اختبارات المشروع: هذا الملف هو ما يقف بين المستخدم وفقدان ذكرياته.

describe('migrate — الرفض', () => {
  it('يرفض ما ليس كائنًا', () => {
    expect(migrate(null)).toBeNull()
    expect(migrate('نص')).toBeNull()
    expect(migrate(42)).toBeNull()
    expect(migrate([])).toBeNull()
  })

  it('يرفض كائنًا بلا رقم إصدار — ليس ملفًّا من التطبيق', () => {
    expect(migrate({ photos: [] })).toBeNull()
  })
})

describe('migrate — بيانات من إصدار أحدث', () => {
  // كان الرفض هنا يعني فقدان البيانات فعليًا: تحدث الحالة مع PWA
  // حين يخدم Service Worker قديم نسخةً أقدم بعد أن كتبت نسخة أحدث.
  it('يقرأ بيانات من إصدار أحدث بدل رفضها', () => {
    const result = migrate({
      version: DATA_VERSION + 5,
      setupComplete: true,
      journal: [{ id: 'j1', text: 'رسالة', date: '2026-01-01', author: 'mom' }],
    })
    expect(result).not.toBeNull()
    expect(result!.journal).toHaveLength(1)
  })

  it('لا يخفض رقم الإصدار المخزَّن', () => {
    const result = migrate({ version: DATA_VERSION + 5 })
    expect(result!.version).toBe(DATA_VERSION + 5)
  })
})

describe('migrate — تنظيف الصفوف التالفة', () => {
  it('يُسقط الصفوف التالفة ويُبقي السليمة', () => {
    const result = migrate({
      version: DATA_VERSION,
      journal: [
        null,
        42,
        { id: 'ok', text: 'رسالة سليمة', date: '2026-01-01', author: 'mom' },
        { id: 'no-text', date: '2026-01-01' },
        { id: 'bad-date', text: 'نص', date: 'ليس تاريخًا' },
      ],
    })
    expect(result!.journal).toHaveLength(1)
    expect(result!.journal[0].id).toBe('ok')
  })

  it('يحذف المعرّفات المكرّرة — تكرارها يكسر مفاتيح React', () => {
    const result = migrate({
      version: DATA_VERSION,
      diapers: [
        { id: 'same', time: '2026-01-01T10:00:00Z', kind: 'wet' },
        { id: 'same', time: '2026-01-01T11:00:00Z', kind: 'dirty' },
      ],
    })
    expect(result!.diapers).toHaveLength(1)
  })

  it('يُسقط صورة بلا أي مصدر عرض', () => {
    const result = migrate({
      version: DATA_VERSION,
      photos: [
        { id: 'p1', date: '2026-01-01' },
        { id: 'p2', date: '2026-01-01', dataUrl: 'data:image/jpeg;base64,xxx' },
        { id: 'p3', date: '2026-01-01', storagePath: 'families/x/p3.jpg' },
      ],
    })
    expect(result!.photos.map((p) => p.id)).toEqual(['p2', 'p3'])
  })

  it('يستبدل الحقول غير المصفوفية بالقيمة الافتراضية', () => {
    const result = migrate({ version: DATA_VERSION, kicks: 'خربان', names: {} })
    expect(result!.kicks).toEqual([])
    expect(result!.names).toEqual([])
  })

  it('يصحّح القيم خارج النطاق المسموح', () => {
    const result = migrate({
      version: DATA_VERSION,
      feedings: [{ id: 'f1', startedAt: '2026-01-01T10:00:00Z', kind: 'مجهول' }],
    })
    expect(result!.feedings[0].kind).toBe('bottle')
  })
})

describe('migrate — التطعيمات', () => {
  it('يعطي الجدول الافتراضي لنسخة قديمة لا تحتوي الحقل', () => {
    const result = migrate({ version: 2, setupComplete: true })
    expect(result!.vaccines.length).toBe(builtInVaccines().length)
  })

  it('يحترم حذف كل الجرعات عمدًا ولا يعيدها', () => {
    // كانت النسخة السابقة تعيد الجدول كاملًا في كل تشغيل
    const result = migrate({ version: DATA_VERSION, vaccines: [] })
    expect(result!.vaccines).toEqual([])
  })

  it('يُبقي الجرعات المخصّصة كما هي', () => {
    const result = migrate({
      version: DATA_VERSION,
      vaccines: [{ id: 'v1', name: 'جرعة خاصة', dueMonths: 3, givenAt: null, builtIn: false }],
    })
    expect(result!.vaccines).toHaveLength(1)
    expect(result!.vaccines[0].name).toBe('جرعة خاصة')
  })
})

describe('migrate — ملف الطفل', () => {
  it('يملأ الحقول الناقصة من القالب الفارغ', () => {
    const result = migrate({ version: DATA_VERSION, child: { name: 'يوسف' } })
    expect(result!.child.name).toBe('يوسف')
    expect(result!.child.gender).toBe('unknown')
    expect(result!.child.parents.momName).toBe(emptyData().child.parents.momName)
  })

  it('يرفض تاريخًا غير صالح ويجعله null', () => {
    const result = migrate({
      version: DATA_VERSION,
      child: { name: 'س', bornAt: 'أمس', dueDate: '2026-11-21' },
    })
    expect(result!.child.bornAt).toBeNull()
    expect(result!.child.dueDate).toBe('2026-11-21')
  })
})

describe('migrate — الحفاظ على المحتوى', () => {
  it('يمرّ على نسخة كاملة سليمة دون فقدان شيء', () => {
    const original = emptyData()
    original.setupComplete = true
    original.child.name = 'لين'
    const round = migrate(JSON.parse(JSON.stringify(original)))
    expect(round).toEqual(original)
  })
})
