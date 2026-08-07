import { beforeEach, describe, expect, it, vi } from 'vitest'

// =============================================================
// اختبارات مزامنة العائلة — بلا اتصال فعلي بـ Firebase.
//
// `firebase/firestore` و`../lib/firebase` مُموَّهان بمخزن في الذاكرة
// يحاكي get/set/onSnapshot فقط، بما يكفي لحراسة العقد الثلاثة:
//   ١) لا صورة ولا تسجيل صوتي يصل أبدًا إلى ما "يُرسَل للشبكة".
//   ٢) رمز غير موجود لا يُنشئ عائلة جديدة أبدًا.
//   ٣) إيقاف المزامنة لا يحذف شيئًا محليًا ولا سحابيًا.
// =============================================================

const fake = vi.hoisted(() => ({
  configured: true,
  store: new Map<string, Record<string, unknown>>(),
  listeners: new Map<string, Set<(data: unknown) => void>>(),
  /** عدد مرات الكتابة — يكشف حلقة الدفع↔الصدى إن عادت */
  writes: 0,
  /**
   * يعيد ترتيب مفاتيح المستند كما يفعل Firestore الحقيقي.
   *
   * Firestore لا يحفظ ترتيب إدراج الحقول ولا يعيدها به، والمحاكاة التي
   * تُرجع الكائن كما استلمته كانت تخفي أخطر عيب في هذا الملف: مقارنةَ
   * الصدى بنصّ JSON يتبع ترتيب المفاتيح.
   */
  shuffle: (doc: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(doc).reverse()) out[key] = doc[key]
    return out
  },
}))

vi.mock('../lib/firebase', () => ({
  isFirebaseConfigured: () => fake.configured,
  ensureAnonymousAuth: () => Promise.resolve('test-uid'),
  getFirestoreDb: () => ({}),
}))

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, _collection: string, id: string) => ({ __path: id }),
  getDoc: async (ref: { __path: string }) => {
    const data = fake.store.get(ref.__path)
    return { exists: () => data !== undefined, data: () => data }
  },
  setDoc: async (
    ref: { __path: string },
    data: Record<string, unknown>,
    opts?: { merge?: boolean },
  ) => {
    const prev = fake.store.get(ref.__path) ?? {}
    const next = fake.shuffle(opts?.merge ? { ...prev, ...data } : data)
    fake.writes += 1
    fake.store.set(ref.__path, next)
    fake.listeners
      .get(ref.__path)
      ?.forEach((cb) => cb({ exists: () => true, data: () => next }))
  },
  onSnapshot: (ref: { __path: string }, onNext: (snap: unknown) => void) => {
    const set = fake.listeners.get(ref.__path) ?? new Set<(data: unknown) => void>()
    set.add(onNext)
    fake.listeners.set(ref.__path, set)
    const data = fake.store.get(ref.__path)
    onNext({ exists: () => data !== undefined, data: () => data })
    return () => set.delete(onNext)
  },
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}))

const { exportSnapshot, importSnapshot } = await import('./dataService')
const { emptyData } = await import('./seed')
const { createFamilySync, joinFamilySync, stopFamilySync, getFamilySyncState, pushToCloud, canonicalJSON } =
  await import('./familySync')
const { syncableSnapshot, addMedication, flush } = await import('./dataService')
type AppData = import('./types').AppData

const PHOTO_DATA_URL = 'data:image/png;base64,AAAAPHOTO'
const VOICE_DATA_URL = 'data:audio/webm;base64,BBBBVOICE'

beforeEach(async () => {
  fake.configured = true
  fake.store.clear()
  fake.listeners.clear()
  fake.writes = 0
  localStorage.clear()
  stopFamilySync()

  const seed = emptyData()
  seed.setupComplete = true
  seed.photos = [
    { id: 'p1', dataUrl: PHOTO_DATA_URL, date: '2026-01-01T00:00:00.000Z', author: 'mom' },
  ]
  seed.voices = [
    {
      id: 'v1',
      dataUrl: VOICE_DATA_URL,
      durationSec: 9,
      date: '2026-01-01T00:00:00.000Z',
      author: 'dad',
    },
  ]
  await importSnapshot(JSON.stringify(seed))
})

describe('createFamilySync', () => {
  it('ينشئ رمزًا بطول ٤٣ حرفًا ويصبح الجهاز متصلًا', async () => {
    const result = await createFamilySync()
    expect(result.ok).toBe(true)
    expect(result.code).toHaveLength(43)
    expect(getFamilySyncState().status).toBe('connected')
  })

  it('لا يرسل صورًا ولا تسجيلات صوتية إلى المستند المُنشأ', async () => {
    const result = await createFamilySync()
    const stored = fake.store.get(result.code!)
    expect(stored).toBeDefined()
    expect(stored).not.toHaveProperty('photos')
    expect(stored).not.toHaveProperty('voices')
    const json = JSON.stringify(stored)
    expect(json).not.toContain('data:image')
    expect(json).not.toContain('data:audio')
  })
})

describe('joinFamilySync', () => {
  it('يرفض الربط برمز غير موجود ولا يُنشئ عائلة جديدة به', async () => {
    const missingCode = 'Z'.repeat(43)
    const result = await joinFamilySync(missingCode)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('لم نجد')
    expect(fake.store.has(missingCode)).toBe(false)
    expect(getFamilySyncState().status).not.toBe('connected')
  })

  it('يرفض رمزًا غير صحيح الشكل دون أي محاولة اتصال', async () => {
    const result = await joinFamilySync('رمز-قصير-غير-صالح')
    expect(result.ok).toBe(false)
    expect(fake.store.size).toBe(0)
  })

  it('يربط بنجاح برمز عائلة موجود فعلًا (محاكاة جهاز ثانٍ)', async () => {
    const created = await createFamilySync()
    stopFamilySync() // الجهاز الأول يفصل — العائلة تبقى موجودة في "السحابة"

    const result = await joinFamilySync(created.code!)
    expect(result.ok).toBe(true)
    expect(getFamilySyncState().code).toBe(created.code)
  })
})

describe('stopFamilySync', () => {
  it('لا يمسّ الصور أو التسجيلات الصوتية المحلية، ويفصل familyId فقط', async () => {
    await createFamilySync()
    stopFamilySync()

    const after = JSON.parse(exportSnapshot()) as AppData
    expect(after.photos).toHaveLength(1)
    expect(after.photos[0].dataUrl).toBe(PHOTO_DATA_URL)
    expect(after.voices).toHaveLength(1)
    expect(after.voices[0].dataUrl).toBe(VOICE_DATA_URL)
    expect(after.familyId).toBeNull()
  })

  it('لا يحذف مستند العائلة السحابي — يبقى قابلًا للربط لاحقًا', async () => {
    const created = await createFamilySync()
    stopFamilySync()
    expect(fake.store.has(created.code!)).toBe(true)
  })
})

describe('حلقة الدفع↔الصدى — أخطر عيب في المزامنة', () => {
  // الصدى العائد من Firestore يحمل المفاتيح بترتيب مختلف عمّا أرسلناه.
  // حين كانت المقارنة على نصّ JSON خام، كان كل صدى يُقرأ «تغييرًا خارجيًا»
  // فيُدمج ويُدفع من جديد… بلا توقّف حتى تنفد حصّة الخطة المجانية وتتعطّل
  // المزامنة كليًّا. هذه الاختبارات تحرس ألا تعود الحلقة.

  it('لا يعيد دفع محتوى لم يتغيّر ولو عاد صداه بترتيب مفاتيح مختلف', async () => {
    const created = await createFamilySync()
    const writesAfterCreate = fake.writes

    await pushToCloud(created.code!, syncableSnapshot(created.code!))
    await pushToCloud(created.code!, syncableSnapshot(created.code!))

    expect(fake.writes).toBe(writesAfterCreate)
  })

  it('تعديل حقيقي يُدفع مرة واحدة ثم يستقرّ', async () => {
    const created = await createFamilySync()
    const before = fake.writes

    await addMedication({
      name: 'حديد',
      form: 'pill',
      frequency: 'daily',
      times: ['08:00'],
      startDate: '2026-08-01',
      endDate: null,
      who: 'mom',
    })
    await flush()

    await pushToCloud(created.code!, syncableSnapshot(created.code!))
    expect(fake.writes).toBe(before + 1)

    // الدفعة التالية بلا تغيير: الصدى استُوعب ولم يُحسب تغييرًا خارجيًا
    await pushToCloud(created.code!, syncableSnapshot(created.code!))
    expect(fake.writes).toBe(before + 1)
  })

  it('canonicalJSON لا يتأثّر بترتيب المفاتيح ويتأثّر بالمحتوى', () => {
    expect(canonicalJSON({ a: 1, b: [{ y: 2, x: 3 }] })).toBe(
      canonicalJSON({ b: [{ x: 3, y: 2 }], a: 1 }),
    )
    expect(canonicalJSON({ a: 1 })).not.toBe(canonicalJSON({ a: 2 }))
    // الحقل الغائب والحقل undefined شيء واحد — كلاهما لا يصل الشبكة أصلًا
    expect(canonicalJSON({ a: 1, b: undefined })).toBe(canonicalJSON({ a: 1 }))
  })
})

describe('حين تكون المزامنة غير مُهيّأة', () => {
  it('لا تُنشئ عائلة ولا تحاول الاتصال', async () => {
    fake.configured = false
    const result = await createFamilySync()
    expect(result.ok).toBe(false)
    expect(fake.store.size).toBe(0)
  })

  it('لا تحاول الربط أيضًا', async () => {
    fake.configured = false
    const result = await joinFamilySync('A'.repeat(43))
    expect(result.ok).toBe(false)
  })
})
