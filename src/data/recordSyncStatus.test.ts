import { describe, expect, it } from 'vitest'
import { resolveRecordSyncStatus, type RecordSyncInput } from './recordSyncStatus'

const connected = (cloudRev: Record<string, string>, hydrated = true): RecordSyncInput['sync'] => ({
  status: 'connected',
  code: 'c'.repeat(43),
  hydrated,
  cloudRev,
})
const base = (over: Partial<RecordSyncInput>): RecordSyncInput => ({
  mediaOnly: false,
  localRev: '2026-10-31T10:00:00.000Z',
  sync: connected({}),
  localSaveFailed: false,
  ...over,
})

describe('resolveRecordSyncStatus', () => {
  it('بلا مزامنة: محفوظ على الجهاز', () => {
    const sync = { status: 'idle' as const, code: null, hydrated: false, cloudRev: {} }
    expect(resolveRecordSyncStatus(base({ sync }), 'a')).toBe('device')
  })

  it('الوسائط محلية دائمًا حتى مع مزامنة سليمة', () => {
    const input = base({ mediaOnly: true, sync: connected({ a: '2099' }) })
    expect(resolveRecordSyncStatus(input, 'a')).toBe('device')
  })

  it('سجل جديد لم يثبت في السحابة ينتظر', () => {
    expect(resolveRecordSyncStatus(base({}), 'a')).toBe('pending')
  })

  it('يتزامن حين يثبت ختم سحابي مساوٍ أو أحدث', () => {
    const sync = connected({ a: '2026-10-31T10:00:00.000Z' })
    expect(resolveRecordSyncStatus(base({ sync }), 'a')).toBe('synced')
  })

  it('إقرار نسخة قديمة لا يغطي تعديلًا أحدث', () => {
    const sync = connected({ a: '2026-10-31T10:00:00.000Z' })
    const input = base({ sync, localRev: '2026-10-31T10:00:05.000Z' })
    expect(resolveRecordSyncStatus(input, 'a')).toBe('pending')
  })

  it('انقطاع المزامنة قبل ثبوت السجل = تعذّر، ولا يُعلن نجاحًا', () => {
    const sync = { ...connected({}), status: 'error' as const }
    expect(resolveRecordSyncStatus(base({ sync }), 'a')).toBe('failed')
  })

  it('سجل ثبت في السحابة يبقى متزامنًا حتى لو انقطع الاتصال بعدها', () => {
    const sync = { ...connected({ a: '2026-10-31T10:00:00.000Z' }), status: 'error' as const }
    expect(resolveRecordSyncStatus(base({ sync }), 'a')).toBe('synced')
  })

  it('فشل الحفظ المحلي يغلب كل حالة', () => {
    const sync = connected({ a: '2099' })
    expect(resolveRecordSyncStatus(base({ sync, localSaveFailed: true }), 'a')).toBe('failed')
  })

  it('سجل بلا ختم يُعدّ متزامنًا بعد وصول نسخة العائلة فقط', () => {
    expect(resolveRecordSyncStatus(base({ localRev: undefined, sync: connected({}, false) }), 'a')).toBe('pending')
    expect(resolveRecordSyncStatus(base({ localRev: undefined }), 'a')).toBe('synced')
  })
})
