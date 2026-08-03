import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageAdapter } from './storage'
import { emptyData } from './seed'

const KEY = 'tafalna:v2'

beforeEach(() => {
  localStorage.clear()
})

describe('LocalStorageAdapter — القاعدة الحاكمة: لا نكتب فوق بيانات موجودة', () => {
  it('يبلّغ عن أول تشغيل حين لا يوجد شيء محفوظ', async () => {
    const result = await new LocalStorageAdapter().read()
    expect(result.status).toBe('empty')
  })

  it('يقرأ نسخة سليمة', async () => {
    const data = emptyData()
    data.setupComplete = true
    localStorage.setItem(KEY, JSON.stringify(data))

    const result = await new LocalStorageAdapter().read()
    expect(result.status).toBe('ok')
    expect(result.status === 'ok' && result.data.setupComplete).toBe(true)
  })

  it('لا يمسّ البيانات الأصلية حين تكون غير مقروءة', async () => {
    // ⚠️ الانحدار الذي يحرسه هذا الاختبار: النسخة السابقة كانت
    // تكتب بيانات فارغة فوق المحتوى التالف فتضيع فرصة الإنقاذ.
    const broken = '{"version":3,"photos":[ هذا ليس JSON'
    localStorage.setItem(KEY, broken)

    const result = await new LocalStorageAdapter().read()

    expect(result.status).toBe('corrupt')
    expect(localStorage.getItem(KEY)).toBe(broken)
  })

  it('يحفظ نسخة إنقاذ خام عند التلف', async () => {
    const broken = '{ تالف }'
    localStorage.setItem(KEY, broken)

    await new LocalStorageAdapter().read()

    const rescued = LocalStorageAdapter.rescueKeys()
    expect(rescued.length).toBe(1)
    expect(LocalStorageAdapter.readRescue(rescued[0])).toBe(broken)
  })

  it('لا يضاعف نسخ الإنقاذ لنفس المحتوى', async () => {
    localStorage.setItem(KEY, '{ تالف }')
    const adapter = new LocalStorageAdapter()
    await adapter.read()
    await adapter.read()
    await adapter.read()
    expect(LocalStorageAdapter.rescueKeys().length).toBe(1)
  })

  it('يعتبر كائنًا بلا رقم إصدار تلفًا ولا يدهسه', async () => {
    const foreign = JSON.stringify({ hello: 'world' })
    localStorage.setItem(KEY, foreign)

    const result = await new LocalStorageAdapter().read()

    expect(result.status).toBe('corrupt')
    expect(localStorage.getItem(KEY)).toBe(foreign)
  })
})

describe('LocalStorageAdapter — الكتابة والاستهلاك', () => {
  it('يكتب ثم يقرأ نفس المحتوى', async () => {
    const adapter = new LocalStorageAdapter()
    const data = emptyData()
    data.child.name = 'لين'
    await adapter.write(data)

    const result = await adapter.read()
    expect(result.status === 'ok' && result.data.child.name).toBe('لين')
  })

  it('يحسب الاستهلاك بالبايت (UTF-16)', async () => {
    const adapter = new LocalStorageAdapter()
    await adapter.write(emptyData())
    const usage = await adapter.usage()
    expect(usage.bytes).toBeGreaterThan(0)
    expect(usage.limit).toBe(5 * 1024 * 1024)
  })
})
