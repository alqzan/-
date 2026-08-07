import { beforeEach, describe, expect, it } from 'vitest'
import {
  addMedication,
  clearSyncedFamilyId,
  exportSnapshot,
  importSnapshot,
  mergeSyncedData,
  syncableSnapshot,
  type SyncedFields,
} from './dataService'
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
    expect(after.journal).toHaveLength(1)
    expect(after.journal[0].id).toBe('j2')
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

  it('مصفوفة فارغة واردة تعني حذفًا فعليًا — لا تُخلط بالغياب', async () => {
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
    expect(after.medications).toEqual([])
  })

  it('يحدّث familyId إلى رمز العائلة الوارد', async () => {
    const remote = syncableSnapshot('new-code-456')
    await mergeSyncedData(remote)
    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.familyId).toBe('new-code-456')
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
