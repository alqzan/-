import { beforeEach, describe, expect, it } from 'vitest'
import {
  addJournal,
  addMedication,
  clearSyncedFamilyId,
  deleteJournal,
  deleteMedication,
  exportSnapshot,
  importSnapshot,
  mergeSyncedData,
  syncableSnapshot,
  updateChild,
  updateJournal,
  type SyncedFields,
} from './dataService'
import { canonicalJSON } from '../lib/canonicalJSON'
import { emptyData } from './seed'
import type { AppData } from './types'

// =============================================================
// حدود عقد المزامنة: ما يخرج من الجهاز (`syncableSnapshot`) وما
// يُسمح لتحديث وارد أن يغيّره (`mergeSyncedData`).
//
// القاعدة الحاكمة التي تحرسها هذه الاختبارات: **الصور والتسجيلات
// الصوتية لا تُرسَل أبدًا، ولا تُمسّ أبدًا عند وصول تحديث سحابي.**
// =============================================================

const PHOTO_DATA_URL = 'data:image/png;base64,AAAAPHOTO'
const VOICE_DATA_URL = 'data:audio/webm;base64,BBBBVOICE'
const APPOINTMENT_IMAGE = 'data:image/png;base64,CCCCSONO'
const CHILD_PHOTO_DATA_URL = 'data:image/png;base64,DDDDCHILD'

function seeded(): AppData {
  const d = emptyData()
  d.setupComplete = true
  d.familyId = 'local-only'
  d.child.name = 'سلمى'
  d.child.photo = CHILD_PHOTO_DATA_URL
  d.photos = [
    { id: 'p1', dataUrl: PHOTO_DATA_URL, date: '2026-01-01T00:00:00.000Z', author: 'mom' },
  ]
  d.voices = [
    {
      id: 'v1',
      dataUrl: VOICE_DATA_URL,
      durationSec: 12,
      date: '2026-01-01T00:00:00.000Z',
      author: 'dad',
    },
  ]
  d.appointments = [
    {
      id: 'a1',
      title: 'سونار',
      dateTime: '2026-02-01T09:00:00.000Z',
      type: 'ultrasound',
      image: APPOINTMENT_IMAGE,
    },
  ]
  d.journal = [{ id: 'j1', text: 'يوم جميل', date: '2026-01-01T00:00:00.000Z', author: 'mom' }]
  return d
}

beforeEach(async () => {
  const result = await importSnapshot(JSON.stringify(seeded()))
  expect(result.ok).toBe(true)
})

describe('syncableSnapshot — ما يُسمح له بمغادرة الجهاز', () => {
  it('لا تحتوي اللقطة على مفتاحي photos أو voices إطلاقًا', () => {
    const snap = syncableSnapshot('code-123') as unknown as Record<string, unknown>
    expect('photos' in snap).toBe(false)
    expect('voices' in snap).toBe(false)
  })

  it('تُسقط صورة كل موعد قبل الإرسال وتُبقي بقية حقوله', () => {
    const snap = syncableSnapshot('code-123')
    expect(snap.appointments[0]).not.toHaveProperty('image')
    expect(snap.appointments[0].title).toBe('سونار')
  })

  it('لا يظهر أي Data URL (صورة أو صوت) في نص اللقطة المُصدَّرة بأي شكل', () => {
    const json = JSON.stringify(syncableSnapshot('code-123'))
    expect(json).not.toContain('data:image')
    expect(json).not.toContain('data:audio')
    expect(json).not.toContain(PHOTO_DATA_URL)
    expect(json).not.toContain(VOICE_DATA_URL)
    expect(json).not.toContain(APPOINTMENT_IMAGE)
    expect(json).not.toContain(CHILD_PHOTO_DATA_URL)
  })

  it('لا تحوي اللقطة أي قيمة undefined — Firestore يرفض الحمولة كلها بسببها', async () => {
    // العطل الذي كان يمنع المزامنة من العمل أصلًا: كل حقل اختياري غائب
    // يخرج من `migrate` مفتاحًا قيمته undefined، فترفض Firestore الدفعة
    // كاملةً («Unsupported field value: undefined») والواجهة تقول «متصل».
    // نمرّ على بيانات مرّت بالترقية فعلًا لأنها المصدر الحقيقي لهذه القيم.
    const withOptionalGaps = emptyData()
    withOptionalGaps.setupComplete = true
    withOptionalGaps.appointments = [
      // بلا location ولا notes — الحالة الشائعة
      { id: 'a9', title: 'متابعة', dateTime: '2026-03-01T09:00:00.000Z', type: 'checkup' },
    ]
    await importSnapshot(JSON.stringify(withOptionalGaps))

    const undefinedPaths: string[] = []
    const walk = (value: unknown, path: string) => {
      if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`))
      if (value === null || typeof value !== 'object') return
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (val === undefined) undefinedPaths.push(`${path}.${key}`)
        else walk(val, `${path}.${key}`)
      }
    }
    walk(syncableSnapshot('code-123'), 'snapshot')

    expect(undefinedPaths).toEqual([])
  })

  it('تُسقط صورة ملف الطفل قبل الإرسال وتُبقي بقية بيانات الطفل', () => {
    const snap = syncableSnapshot('code-123')
    expect(snap.child.photo).toBeNull()
    expect(snap.child.name).toBe('سلمى')
  })
})

describe('mergeSyncedData — لا يمسّ الوسائط المحلية أبدًا', () => {
  it('يستبقي الصور المحلية رغم غيابها التام عن التحديث الوارد', async () => {
    const remote: SyncedFields = { ...syncableSnapshot('code-123'), journal: [] }
    await mergeSyncedData(remote)
    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.photos).toHaveLength(1)
    expect(after.photos[0].dataUrl).toBe(PHOTO_DATA_URL)
  })

  it('يستبقي التسجيلات الصوتية المحلية كما هي', async () => {
    const remote: SyncedFields = syncableSnapshot('code-123')
    await mergeSyncedData(remote)
    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.voices).toHaveLength(1)
    expect(after.voices[0].dataUrl).toBe(VOICE_DATA_URL)
  })

  it('يستبقي صورة الموعد المحلية حين لا يحملها التحديث الوارد', async () => {
    const remote = syncableSnapshot('code-123') // بلا صورة الموعد أصلًا — العقد يُسقطها دومًا
    await mergeSyncedData(remote)
    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.appointments[0].image).toBe(APPOINTMENT_IMAGE)
  })

  it('يستبقي صورة ملف الطفل المحلية رغم أن التحديث الوارد يحملها فارغة', async () => {
    const remote = syncableSnapshot('code-123') // child.photo فيها null دومًا
    expect(remote.child.photo).toBeNull() // تأكيد أن الاختبار يحرس الحالة الصحيحة فعلًا
    await mergeSyncedData(remote)
    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.child.photo).toBe(CHILD_PHOTO_DATA_URL)
  })

  it('يطبّق فعليًا التغييرات النصية الواردة (اليوميات مثلًا)', async () => {
    const remote: SyncedFields = {
      ...syncableSnapshot('code-123'),
      journal: [
        { id: 'j2', text: 'أضافه الطرف الآخر', date: '2026-01-02T00:00:00.000Z', author: 'dad' },
      ],
    }
    await mergeSyncedData(remote)
    const after = JSON.parse(exportSnapshot()) as AppData
    // الوارد يصل، والمحلي يبقى — الاتحاد لا الاستبدال
    expect(after.journal.map((j) => j.id).sort()).toEqual(['j1', 'j2'])
  })

  it('ينقل الأدوية وسجلّ الجرعات — جرعة سجّلها أحد الوالدين تصل الآخر', async () => {
    const remote: SyncedFields = {
      ...syncableSnapshot('code-123'),
      medications: [
        {
          id: 'md1',
          name: 'حديد',
          form: 'pill',
          frequency: 'daily',
          times: ['08:00', '20:00'],
          startDate: '2026-08-01',
          endDate: null,
          who: 'mom',
          archived: false,
          createdAt: '2026-08-01T09:00:00.000Z',
        },
      ],
      medDoses: [
        {
          id: 'dose1',
          medId: 'md1',
          day: '2026-08-05',
          time: '08:00',
          takenAt: '2026-08-05T05:10:00.000Z',
        },
      ],
    }
    await mergeSyncedData(remote)
    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.medications[0].name).toBe('حديد')
    expect(after.medDoses).toHaveLength(1)
    expect(after.medDoses[0].time).toBe('08:00')
  })

  it('تحديث من جهاز بإصدار أقدم (بلا حقل الأدوية) لا يمسح الأدوية المحلية', async () => {
    // الجهاز الآخر قد يكون على نسخة قديمة مخزّنة في الـ Service Worker،
    // فيصل تحديثه بلا الحقول التي أُضيفت بعده. الغياب ليس حذفًا — ولو
    // نُسخ كما هو لصار `undefined` في مكان مصفوفة وانهارت أول شاشة تقرؤه.
    await addMedication({
      name: 'حديد',
      form: 'pill',
      frequency: 'daily',
      times: ['08:00'],
      startDate: '2026-08-01',
      endDate: null,
      who: 'mom',
    })

    const { medications: _meds, medDoses: _doses, ...legacy } = syncableSnapshot('code-123')
    await mergeSyncedData(legacy as SyncedFields)

    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.medications).toHaveLength(1)
    expect(after.medications[0].name).toBe('حديد')
    expect(after.medDoses).toEqual([])
  })

  it('مصفوفة فارغة واردة بلا شاهدة حذف لا تمسح شيئًا', async () => {
    // هذا هو العطل نفسه الذي حذف بيانات العائلة: الجهاز الآخر قد تصله
    // مصفوفة فارغة لأنه ببساطة لم يستقبل الدواء بعد — لا لأن أحدًا حذفه.
    await addMedication({
      name: 'حديد',
      form: 'pill',
      frequency: 'daily',
      times: ['08:00'],
      startDate: '2026-08-01',
      endDate: null,
      who: 'mom',
    })
    await mergeSyncedData({ ...syncableSnapshot('code-123'), medications: [] })
    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.medications).toHaveLength(1)
    expect(after.medications[0].name).toBe('حديد')
  })

  it('يحدّث familyId إلى رمز العائلة الوارد', async () => {
    const remote = syncableSnapshot('new-code-456')
    await mergeSyncedData(remote)
    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.familyId).toBe('new-code-456')
  })
})

// =============================================================
// العطل الذي فقد به المستخدم بياناته: الوارد كان يحلّ محلّ المحلي
// كاملًا. جهاز يفتح التطبيق حاملًا نسخة أقدم — لأنه كان مغلقًا، أو
// خارج الشبكة، أو لأن أول لقطة تأخّرت ثانيةً عن أول دفعة — كان يمحو
// كل ما كُتب على الجهاز الآخر في غيابه.
//
// العقد الجديد الذي تحرسه هذه الاختبارات:
//   • الغياب ليس حذفًا. لا يُحذف شيء إلا بشاهدة حذف صريحة.
//   • الشاهدة تُنقل الحذف فعلًا — «حذفت من جهازي» تعني الجهازين.
//   • التعارض يُحسم بالأحدث ختمًا، لا بمن دفع أخيرًا.
//   • النتيجة واحدة على الجهازين، فلا يتدافعان الكتابة بلا نهاية.
// =============================================================

/** بيانات جهاز مستقلّ: نستبدل الحالة كاملةً ثم نلتقط لقطته السحابية */
async function asDevice(build: () => Promise<void>): Promise<SyncedFields> {
  await importSnapshot(JSON.stringify(seeded()))
  await build()
  return syncableSnapshot('code-123')
}

describe('الدمج لا يفقد كتابة لم يرها الطرف الآخر', () => {
  it('ما كُتب هنا أثناء انقطاع الشبكة يبقى حين تصل نسخة السحابة', async () => {
    // السحابة كما تركها الطرف الآخر: بلا يومياتنا الجديدة
    const cloud = await asDevice(async () => {
      await addJournal({ text: 'من جهاز الأب', date: '2026-01-03T00:00:00.000Z', author: 'dad' })
      await deleteJournal('j1')
    })

    // جهازنا: كتب المستخدم بينما كان مقطوعًا عن الشبكة
    await importSnapshot(JSON.stringify(seeded()))
    await addJournal({ text: 'كُتبت والشبكة مقطوعة', date: '2026-01-04T00:00:00.000Z', author: 'mom' })

    await mergeSyncedData(cloud)

    const after = JSON.parse(exportSnapshot()) as AppData
    const texts = after.journal.map((j) => j.text)
    expect(texts).toContain('كُتبت والشبكة مقطوعة')
    expect(texts).toContain('من جهاز الأب')
  })

  it('لقطة قديمة تصل من جهاز نائم لا تحذف ما كُتب بعدها', async () => {
    // جهاز نام قبل أن نضيف أي شيء، ثم استيقظ ودفع لقطته كما هي
    const stale = syncableSnapshot('code-123')

    await addMedication({
      name: 'حديد',
      form: 'pill',
      frequency: 'daily',
      times: ['08:00'],
      startDate: '2026-08-01',
      endDate: null,
      who: 'mom',
    })
    await addJournal({ text: 'بعد نوم الجهاز الآخر', date: '2026-02-01T00:00:00.000Z', author: 'mom' })

    await mergeSyncedData(stale)

    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.medications).toHaveLength(1)
    expect(after.journal.map((j) => j.text)).toContain('بعد نوم الجهاز الآخر')
  })
})

describe('الحذف يُنقل بشاهدة صريحة', () => {
  it('ما حُذف على الجهاز الآخر يُحذف هنا أيضًا', async () => {
    const cloud = await asDevice(() => deleteJournal('j1').then(() => undefined))

    await importSnapshot(JSON.stringify(seeded())) // نسختنا ما زالت تحمل j1
    await mergeSyncedData(cloud)

    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.journal.map((j) => j.id)).not.toContain('j1')
  })

  it('الحذف لا يعود من القبر في الجولة التالية', async () => {
    const cloud = await asDevice(() => deleteJournal('j1').then(() => undefined))
    await importSnapshot(JSON.stringify(seeded()))
    await mergeSyncedData(cloud)

    // الجهاز الآخر يدفع لقطته من جديد وفيها الشاهدة نفسها
    await mergeSyncedData(cloud)

    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.journal.map((j) => j.id)).not.toContain('j1')
  })

  it('عنصر أُضيف بعد الحذف يبقى — الشاهدة أقدم من ختمه', async () => {
    const cloud = await asDevice(() => deleteMedication('none').then(() => undefined))

    await importSnapshot(JSON.stringify(seeded()))
    await addMedication({
      name: 'حديد',
      form: 'pill',
      frequency: 'daily',
      times: ['08:00'],
      startDate: '2026-08-01',
      endDate: null,
      who: 'mom',
    })
    await mergeSyncedData(cloud)

    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.medications).toHaveLength(1)
  })
})

describe('التعارض يُحسم بالأحدث', () => {
  it('تعديل أحدث على العنصر نفسه يفوز على الأقدم', async () => {
    const cloud = await asDevice(() => updateJournal('j1', { text: 'نصّ الجهاز الآخر' }).then(() => undefined))

    await importSnapshot(JSON.stringify(seeded()))
    await new Promise((r) => setTimeout(r, 2)) // ختمنا يأتي بعده بمللي ثانية
    await updateJournal('j1', { text: 'نصّنا الأحدث' })

    await mergeSyncedData(cloud)

    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.journal.find((j) => j.id === 'j1')?.text).toBe('نصّنا الأحدث')
  })

  it('ملف الطفل يتبع الأحدث ختمًا، وصورته المحلية لا تتأثّر', async () => {
    const cloud = await asDevice(() => updateChild({ name: 'اسم الجهاز الآخر' }).then(() => undefined))

    await importSnapshot(JSON.stringify(seeded()))
    await new Promise((r) => setTimeout(r, 2))
    await updateChild({ name: 'اسمنا الأحدث' })

    await mergeSyncedData(cloud)

    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.child.name).toBe('اسمنا الأحدث')
    expect(after.child.photo).toBe(CHILD_PHOTO_DATA_URL)
  })
})

describe('التقارب — لا تدافع كتابة بلا نهاية', () => {
  it('الجهازان يخرجان بالنتيجة نفسها حرفًا بحرف بعد جولة واحدة', async () => {
    // جهازهم: أضافوا رسالة وحذفوا أخرى. نحفظ حالته كاملةً لنعود إليه
    // كما هو — لا أن نعيد بناءه، فيصير جهازًا ثالثًا بمعرّفات جديدة.
    const theirs = await asDevice(async () => {
      await addJournal({ text: 'عندهم', date: '2026-03-01T00:00:00.000Z', author: 'dad' })
      await deleteJournal('j1')
    })
    const theirDevice = exportSnapshot()

    // جهازنا يدمج نسختهم ثم يدفع اتحاده
    await importSnapshot(JSON.stringify(seeded()))
    await addJournal({ text: 'عندنا', date: '2026-03-02T00:00:00.000Z', author: 'mom' })
    await mergeSyncedData(theirs)
    const ours = syncableSnapshot('code-123')

    // ثم يدمج جهازهم ما دفعناه — ويجب أن يخرج بالنتيجة ذاتها
    await importSnapshot(theirDevice)
    await mergeSyncedData(ours)
    const theirsAfter = syncableSnapshot('code-123')

    expect(canonicalJSON(theirsAfter.journal)).toBe(canonicalJSON(ours.journal))
    // وما دام النصّان متطابقين فلا شيء يدفعه أيٌّ منهما بعد الآن
    expect(canonicalJSON(theirsAfter)).toBe(canonicalJSON(ours))
  })

  it('إعادة دمج اللقطة نفسها لا تغيّر شيئًا', async () => {
    const cloud = await asDevice(() =>
      addJournal({ text: 'واحدة', date: '2026-04-01T00:00:00.000Z', author: 'dad' }).then(
        () => undefined,
      ),
    )

    await importSnapshot(JSON.stringify(seeded()))
    await mergeSyncedData(cloud)
    const once = canonicalJSON(syncableSnapshot('code-123'))
    await mergeSyncedData(cloud)
    const twice = canonicalJSON(syncableSnapshot('code-123'))

    expect(twice).toBe(once)
  })
})

describe('clearSyncedFamilyId — فصل الجهاز دون حذف أي بيانات', () => {
  it('يعيد familyId إلى null دون أن يمسّ الصور أو التسجيلات أو النصوص', async () => {
    await clearSyncedFamilyId()
    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.familyId).toBeNull()
    expect(after.photos).toHaveLength(1)
    expect(after.voices).toHaveLength(1)
    expect(after.journal).toHaveLength(1)
  })
})
