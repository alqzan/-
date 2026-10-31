import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { emptyData } from './seed'
import type { AppData } from './types'
import type { StorageAdapter } from './storage'

const media = vi.hoisted(() => ({ files: new Map<string, Blob>(), serial: 0 }))
vi.mock('./mediaStore', () => ({
  isMediaStoreSupported: () => true,
  newMediaKey: () => `new-${++media.serial}`,
  putAudio: async (key: string, blob: Blob) => { media.files.set(key, blob) },
  getAudio: async (key: string) => media.files.get(key) ?? null,
  deleteAudio: async (key: string) => { media.files.delete(key) },
  keepOnly: async (keys: string[]) => {
    for (const key of media.files.keys()) if (!keys.includes(key)) media.files.delete(key)
  },
  blobToDataUrl: async () => 'data:audio/webm;base64,bmV3',
  dataUrlToBlob: async () => new Blob(['new'], { type: 'audio/webm' }),
}))

let service: typeof import('./dataService')
let disk: AppData
let fail: boolean
let incoming: (data: AppData) => void
beforeEach(async () => {
  vi.resetModules()
  media.files.clear()
  disk = emptyData()
  disk.setupComplete = true
  disk.voices = [{ id: 'voice', localKey: 'old', durationSec: 2, date: '2026-01-01', author: 'mom' }]
  disk.photos = [{ id: 'photo', dataUrl: 'data:image/png;base64,b2xk', date: '2026-01-01', author: 'dad' }]
  media.files.set('old', new Blob(['old']))
  fail = false
  const adapter: StorageAdapter = {
    read: async () => ({ status: 'ok', data: disk }),
    write: async next => { if (fail) throw new Error('full'); disk = next },
    subscribe: callback => { incoming = callback; return () => {} },
    usage: async () => ({ bytes: 0, limit: null }),
  }
  service = await import('./dataService')
  service.setStorageAdapter(adapter)
  await service.boot()
})
afterEach(() => vi.useRealTimers())

it('failed restore keeps the old records and original audio, removing only staged audio', async () => {
  const before = service.exportSnapshot()
  const replacement = emptyData()
  replacement.voices = [{ id: 'replacement', localKey: 'old', dataUrl: 'data:audio/webm;base64,bmV3', durationSec: 3, date: '2026-01-02', author: 'dad' }]
  fail = true
  expect((await service.importSnapshot(JSON.stringify(replacement))).ok).toBe(false)
  expect(service.exportSnapshot()).toBe(before)
  expect(disk.photos).toHaveLength(1)
  expect([...media.files.keys()]).toEqual(['old'])
})

it('successful restore uses a fresh media key before removing old audio', async () => {
  const replacement = emptyData()
  replacement.voices = [{ id: 'replacement', localKey: 'old', dataUrl: 'data:audio/webm;base64,bmV3', durationSec: 3, date: '2026-01-02', author: 'dad' }]
  expect((await service.importSnapshot(JSON.stringify(replacement))).ok).toBe(true)
  expect(disk.voices[0].localKey).not.toBe('old')
  expect(media.files.has(disk.voices[0].localKey!)).toBe(true)
  expect(media.files.has('old')).toBe(false)
})

it('refuses a complete backup if any audio file cannot be read', async () => {
  media.files.clear()
  await expect(service.exportSnapshotWithMedia()).rejects.toThrow('تعذّرت قراءة')
})

it('الخيار الصريح يصدّر النسخة مع بقاء المرجع، ولا يغيّر الافتراضي الصارم', async () => {
  media.files.clear()
  const json = await service.exportSnapshotWithMedia({ allowMissing: true })
  const parsed = JSON.parse(json) as AppData
  expect(parsed.voices.length).toBeGreaterThan(0)
  expect(parsed.voices[0]!.localKey).toBeTruthy()
  await expect(service.exportSnapshotWithMedia()).rejects.toBeInstanceOf(service.MissingMediaError)
})

it('age editing keeps every existing record and audio reference through reload data', async () => {
  const before = JSON.parse(service.exportSnapshot()) as AppData
  const pending = service.updateChild({ lmpDate: '2026-04-01', dueDate: '2027-01-06' })
  await service.flush()
  expect(await pending).toBe(true)
  expect({ ...disk, child: before.child, syncMeta: before.syncMeta }).toEqual(before)
  expect(media.files.has('old')).toBe(true)
})

it('keeps both parents records when an external tab arrives during an unsaved addition', async () => {
  vi.useFakeTimers()
  const remote = structuredClone(disk)
  remote.journal = [{ id: 'wife', text: 'زوجتي', date: '2026-01-01', author: 'mom' }]
  const pending = service.addJournal({ text: 'أنا', date: '2026-01-01', author: 'dad' })
  incoming(remote)
  await service.flush()
  expect(await pending).toBe(true)
  expect(disk.journal.map(j => j.text).sort()).toEqual(['أنا', 'زوجتي'])
  expect(disk.voices[0].localKey).toBe('old')
  expect(disk.photos).toHaveLength(1)
})

it('does not discard a pending photo when another tab adds a record', async () => {
  const remote = structuredClone(disk)
  const pending = service.addPhoto({ dataUrl: 'data:image/png;base64,bmV3', date: '2026-01-02', author: 'dad' })
  incoming(remote)
  await service.flush()
  expect(await pending).toBe(true)
  expect(disk.photos).toHaveLength(2)
})

it('failed ordinary save rolls back so retry does not duplicate the unsaved memory', async () => {
  fail = true
  const pending = service.addJournal({ text: 'retry', date: '2026-01-01', author: 'mom' })
  await service.flush()
  expect(await pending).toBe(false)
  expect(JSON.parse(service.exportSnapshot()).journal).toHaveLength(0)
  fail = false
  const retry = service.addJournal({ text: 'retry', date: '2026-01-01', author: 'mom' })
  await service.flush()
  expect(await retry).toBe(true)
  expect(disk.journal).toHaveLength(1)
})

it('adopts a completed restore from another tab without resurrecting old memories', async () => {
  const restored = emptyData()
  restored.setupComplete = true
  incoming(restored)
  expect(JSON.parse(service.exportSnapshot()).photos).toHaveLength(0)
  const pending = service.addJournal({ text: 'after restore', date: '2026-01-01', author: 'mom' })
  await service.flush()
  expect(await pending).toBe(true)
  expect(disk.photos).toHaveLength(0)
})

it('preserves only pending changes when another tab restores an older complete snapshot', async () => {
  const restored = emptyData()
  restored.setupComplete = true
  const pending = service.addJournal({ text: 'unsaved new memory', date: '2026-01-01', author: 'dad' })
  incoming(restored)
  await service.flush()
  expect(await pending).toBe(true)
  expect(disk.photos).toHaveLength(0)
  expect(disk.journal[0].text).toBe('unsaved new memory')
})

it('rollback of a later failed write keeps an earlier in-flight write that succeeded', async () => {
  let release!: () => void
  let count = 0
  service.setStorageAdapter({
    read: async () => ({ status: 'ok', data: disk }),
    subscribe: () => () => {},
    usage: async () => ({ bytes: 0, limit: null }),
    write: async next => {
      if (++count > 1) throw new Error('second write failed')
      await new Promise<void>(resolve => { release = resolve })
      disk = next
    },
  })
  const first = service.addJournal({ text: 'A', date: '2026-01-01', author: 'mom' })
  const flushingFirst = service.flush()
  const second = service.addJournal({ text: 'B', date: '2026-01-01', author: 'dad' })
  release()
  await flushingFirst
  await service.flush()
  expect(await first).toBe(true)
  expect(await second).toBe(false)
  expect(JSON.parse(service.exportSnapshot()).journal.map((j: { text: string }) => j.text)).toEqual(['A'])
  expect(disk.journal.map(j => j.text)).toEqual(['A'])
})

it('failed explicit reset leaves all audio and old records intact', async () => {
  const before = service.exportSnapshot()
  fail = true
  expect(await service.resetAllData()).toBe(false)
  expect(service.exportSnapshot()).toBe(before)
  expect(media.files.has('old')).toBe(true)
})

it('failed deletion of a voice keeps the recording file and its record', async () => {
  fail = true
  const pending = service.deleteVoice('voice')
  await service.flush()
  expect(await pending).toBe(false)
  expect(media.files.has('old')).toBe(true)
  expect(disk.voices[0].id).toBe('voice')
})

it('keeps all stored collection contents through gender and age edits then a fresh boot', async () => {
  const { seedData } = await import('./seed')
  const fixture = seedData()
  expect((await service.importSnapshot(JSON.stringify(fixture))).ok).toBe(true)
  const before = JSON.parse(service.exportSnapshot()) as AppData
  const pending = service.updateChild({ gender: 'girl', lmpDate: '2026-04-01', dueDate: '2027-01-06' })
  await service.flush()
  expect(await pending).toBe(true)
  vi.resetModules()
  const reloaded = await import('./dataService')
  reloaded.setStorageAdapter({
    read: async () => ({ status: 'ok', data: disk }),
    write: async next => { disk = next },
    subscribe: () => () => {},
    usage: async () => ({ bytes: 0, limit: null }),
  })
  await reloaded.boot()
  const after = JSON.parse(reloaded.exportSnapshot()) as AppData
  expect(after.child.gender).toBe('girl')
  expect({ ...after, child: before.child, syncMeta: before.syncMeta }).toEqual(before)
})
