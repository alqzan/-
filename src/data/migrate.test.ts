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

describe('migrate — الأدوية', () => {
  it('نسخة قديمة بلا حقل الأدوية تبدأ فارغة لا تالفة', () => {
    const result = migrate({ version: 4, setupComplete: true })
    expect(result!.medications).toEqual([])
    expect(result!.medDoses).toEqual([])
  })

  it('يُبقي الدواء السليم بكامل جدوله', () => {
    const result = migrate({
      version: DATA_VERSION,
      medications: [
        {
          id: 'm1',
          name: 'حديد',
          form: 'pill',
          frequency: 'everyNDays',
          everyDays: 2,
          times: ['08:00', '20:00'],
          startDate: '2026-08-01',
          endDate: null,
          who: 'mom',
          archived: false,
          createdAt: '2026-08-01T09:00:00.000Z',
        },
      ],
    })
    expect(result!.medications).toHaveLength(1)
    expect(result!.medications[0]).toMatchObject({
      name: 'حديد',
      frequency: 'everyNDays',
      everyDays: 2,
      times: ['08:00', '20:00'],
    })
  })

  it('يُسقط دواءً بلا اسم أو بلا يوم بداية صالح — لا يمكن جدولته أصلًا', () => {
    const result = migrate({
      version: DATA_VERSION,
      medications: [
        { id: 'a', startDate: '2026-08-01' },
        { id: 'b', name: 'بلا بداية' },
        { id: 'c', name: 'بداية مشوّهة', startDate: '01/08/2026' },
      ],
    })
    expect(result!.medications).toEqual([])
  })

  it('يُسقط الأوقات المشوّهة وحدها ويُبقي الدواء', () => {
    const result = migrate({
      version: DATA_VERSION,
      medications: [
        { id: 'm1', name: 'تحميلة', startDate: '2026-08-01', times: ['21:00', '99:99', 'الليل'] },
      ],
    })
    expect(result!.medications[0].times).toEqual(['21:00'])
  })

  it('يعيد دواءً مجدولًا بلا وقت صالح إلى جرعة صباحية بدل إخفائه للأبد', () => {
    const result = migrate({
      version: DATA_VERSION,
      medications: [{ id: 'm1', name: 'دواء', startDate: '2026-08-01', times: [] }],
    })
    expect(result!.medications[0].times).toEqual(['08:00'])
  })

  it('يُبقي «عند اللزوم» بلا أوقات', () => {
    const result = migrate({
      version: DATA_VERSION,
      medications: [
        { id: 'm1', name: 'مسكّن', startDate: '2026-08-01', frequency: 'asNeeded', times: ['08:00'] },
      ],
    })
    expect(result!.medications[0].times).toEqual([])
  })

  it('يقبل سجلّ جرعة بوقت فارغ (عند اللزوم) ويرفض ما لا دواء له', () => {
    const result = migrate({
      version: DATA_VERSION,
      medDoses: [
        { id: 'd1', medId: 'm1', day: '2026-08-05', time: '', takenAt: '2026-08-05T10:00:00Z' },
        { id: 'd2', day: '2026-08-05', time: '08:00' },
        { id: 'd3', medId: 'm1', day: 'أمس' },
      ],
    })
    expect(result!.medDoses).toHaveLength(1)
    expect(result!.medDoses[0].id).toBe('d1')
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

describe('دفتر التغييرات (syncMeta)', () => {
  it('يبدأ فارغًا حين لا يحمله الملف — بيانات ما قبل الإصدار ٦', () => {
    const result = migrate({ version: DATA_VERSION })
    expect(result!.syncMeta).toEqual({ rev: {}, deleted: {} })
  })

  it('يقرأ الأختام الصالحة ويُسقط ما لا يصلح مفتاحًا أو تاريخًا', () => {
    const result = migrate({
      version: DATA_VERSION,
      syncMeta: {
        rev: { j1: '2026-01-01T00:00:00.000Z', j2: 'ليس تاريخًا', '': '2026-01-01T00:00:00.000Z' },
        // مفتاح يبدأ بـ __ محجوز في Firestore وكتابته تُفشل الدفعة كلها
        deleted: { j3: '2026-01-02T00:00:00.000Z', __proto__x: '2026-01-02T00:00:00.000Z' },
        childRev: '2026-01-03T00:00:00.000Z',
      },
    })

    expect(result!.syncMeta.rev).toEqual({ j1: '2026-01-01T00:00:00.000Z' })
    expect(result!.syncMeta.deleted).toEqual({ j3: '2026-01-02T00:00:00.000Z' })
    expect(result!.syncMeta.childRev).toBe('2026-01-03T00:00:00.000Z')
  })

  it('دفتر تالف الشكل لا يُسقط بقية البيانات', () => {
    const result = migrate({ version: DATA_VERSION, syncMeta: 'خربان' })
    expect(result).not.toBeNull()
    expect(result!.syncMeta).toEqual({ rev: {}, deleted: {} })
  })
})
