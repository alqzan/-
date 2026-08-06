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
    const next = opts?.merge ? { ...prev, ...data } : data
    fake.store.set(ref.__path, next)
    fake.listeners.get(ref.__path)?.forEach((cb) => cb(next))
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
const { createFamilySync, joinFamilySync, stopFamilySync, getFamilySyncState } =
  await import('./familySync')
type AppData = import('./types').AppData

const PHOTO_DATA_URL = 'data:image/png;base64,AAAAPHOTO'
const VOICE_DATA_URL = 'data:audio/webm;base64,BBBBVOICE'

beforeEach(async () => {
  fake.configured = true
  fake.store.clear()
  fake.listeners.clear()
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
