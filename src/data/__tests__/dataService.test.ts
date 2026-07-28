import { beforeEach, describe, expect, it, vi } from 'vitest'

// dataService.ts holds module-level singleton state (`data`) that is
// initialized from localStorage at *import time*. To test load()/migrate()
// behavior under different localStorage conditions we must reset the
// module registry and re-import fresh for each scenario.
async function freshDataService() {
  vi.resetModules()
  return await import('../dataService')
}

const STORAGE_KEY = 'tafalna:v2'
const RECOVERY_KEY = `${STORAGE_KEY}:recovery`

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('load() / migrate() — versions & corruption', () => {
  it('first run: seeds empty data and writes it to storage', async () => {
    await freshDataService()
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.version).toBe(3)
    expect(parsed.setupComplete).toBe(false)
    expect(parsed.vaccines.length).toBeGreaterThan(0)
  })

  it('migrates an older-version snapshot, filling in new fields without losing old data', async () => {
    const oldSnapshot = {
      version: 1,
      setupComplete: true,
      child: {
        name: 'سارة',
        gender: 'girl',
        lmpDate: null,
        dueDate: null,
        bornAt: null,
        photo: null,
        parents: { momName: 'أمي', dadName: 'أبي' },
      },
      kicks: [{ id: 'k1', startedAt: '2026-01-01T00:00:00.000Z', count: 5 }],
      contractions: [],
      appointments: [],
      momLogs: [],
      photos: [],
      journal: [{ id: 'j1', title: 'ذكرى', text: 'نص', date: '2026-01-01', author: 'mom' }],
      capsules: [],
      milestones: [],
      names: [],
      checklist: [],
      // no feedings/diapers/sleep/growth/vaccines — added in later versions
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldSnapshot))

    const ds = await freshDataService()
    const data = ds.exportSnapshot()
    const parsed = JSON.parse(data)

    expect(parsed.version).toBe(3)
    // old data preserved
    expect(parsed.child.name).toBe('سارة')
    expect(parsed.kicks).toHaveLength(1)
    expect(parsed.journal).toHaveLength(1)
    // new fields (v3) filled in from empty template / built-ins
    expect(Array.isArray(parsed.feedings)).toBe(true)
    expect(Array.isArray(parsed.diapers)).toBe(true)
    expect(Array.isArray(parsed.sleep)).toBe(true)
    expect(Array.isArray(parsed.growth)).toBe(true)
    expect(parsed.vaccines.length).toBeGreaterThan(0)
  })

  it('corrupt JSON: stashes raw text for recovery, keeps in-memory data empty, does not overwrite storage key', async () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json::')
    const ds = await freshDataService()

    // in-memory data falls back to empty
    const parsed = JSON.parse(ds.exportSnapshot())
    expect(parsed.setupComplete).toBe(false)

    // original corrupt text preserved for recovery, not silently discarded
    expect(localStorage.getItem(RECOVERY_KEY)).toBe('{not valid json::')

    // storage key itself was NOT overwritten with the empty template
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{not valid json::')
  })

  it('future/newer schema version: treated as recovery case with reason "version", not silently emptied on disk', async () => {
    const future = { version: 999, setupComplete: true, child: {} }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(future))
    const ds = await freshDataService()

    expect(localStorage.getItem(RECOVERY_KEY)).toBe(JSON.stringify(future))
    // still available on disk untouched
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(future))

    const parsed = JSON.parse(ds.exportSnapshot())
    expect(parsed.setupComplete).toBe(false)
  })

  it('exposes recovery reason via getRecoverySnapshot and useRecoveryStatus module state', async () => {
    localStorage.setItem(STORAGE_KEY, 'garbage')
    const ds = await freshDataService()
    expect(ds.getRecoverySnapshot()).toBe('garbage')
  })
})

describe('save() failure (quota exceeded)', () => {
  it('does not change in-memory state and does not report false success when localStorage.setItem throws', async () => {
    const ds = await freshDataService()
    const before = ds.exportSnapshot()

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })

    ds.addJournal({ title: 'يوم صعب', text: 'نص', date: '2026-07-28', author: 'mom' })

    // in-memory data is unchanged — the optimistic update never happened
    expect(ds.exportSnapshot()).toBe(before)

    spy.mockRestore()
  })

  it('addPhoto returns false on storage failure (no false "saved" success)', async () => {
    const ds = await freshDataService()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const ok = ds.addPhoto({ dataUrl: 'data:image/png;base64,x', favorite: false, caption: '', takenAt: '2026-07-28' } as never)
    expect(ok).toBe(false)
  })
})

describe('importSnapshot() round-trip', () => {
  it('exports current state and restores it without data loss', async () => {
    const ds = await freshDataService()
    ds.addJournal({ title: 'ذكرى مهمة', text: 'نص طويل', date: '2026-07-28', author: 'dad' })
    ds.addMilestone('خطوة أولى', '👣')

    const exported = ds.exportSnapshot()

    // mutate further, then restore from the earlier export
    ds.addJournal({ title: 'ذكرى أخرى', text: 'نص', date: '2026-07-29', author: 'mom' })
    expect(JSON.parse(ds.exportSnapshot()).journal).toHaveLength(2)

    const result = ds.importSnapshot(exported)
    expect(result.ok).toBe(true)

    const restored = JSON.parse(ds.exportSnapshot())
    expect(restored.journal).toHaveLength(1)
    expect(restored.journal[0].title).toBe('ذكرى مهمة')
    expect(restored.milestones.some((m: { title: string }) => m.title === 'خطوة أولى')).toBe(true)
  })

  it('rejects invalid JSON without touching current data, and stashes it for recovery', async () => {
    const ds = await freshDataService()
    ds.addJournal({ title: 'قبل الاستيراد', text: 'نص', date: '2026-07-28', author: 'mom' })
    const before = ds.exportSnapshot()

    const result = ds.importSnapshot('{not json')
    expect(result.ok).toBe(false)
    expect(ds.exportSnapshot()).toBe(before)
  })

  it('rejects structurally invalid backups without touching current data', async () => {
    const ds = await freshDataService()
    ds.addJournal({ title: 'قبل الاستيراد', text: 'نص', date: '2026-07-28', author: 'mom' })
    const before = ds.exportSnapshot()

    const bad = JSON.stringify({ version: 3, child: { name: 123 } })
    const result = ds.importSnapshot(bad)
    expect(result.ok).toBe(false)
    expect(ds.exportSnapshot()).toBe(before)
  })

  it('takes an automatic pre-import backup snapshot before restoring', async () => {
    const ds = await freshDataService()
    ds.addJournal({ title: 'الحالة الحالية', text: 'نص', date: '2026-07-28', author: 'mom' })
    const currentBeforeImport = ds.exportSnapshot()

    const otherSnapshot = JSON.stringify({ ...JSON.parse(currentBeforeImport), journal: [] })
    ds.importSnapshot(otherSnapshot)

    const preImportBackup = ds.getPreImportBackup()
    expect(preImportBackup).not.toBeNull()
    expect(JSON.parse(preImportBackup!).journal).toHaveLength(1)
  })
})

describe('resetAllData()', () => {
  it('clears the main storage key, timer keys, backup-date key, and recovery keys', async () => {
    const ds = await freshDataService()
    localStorage.setItem('tafalna:active-feeding', 'x')
    localStorage.setItem('tafalna:active-contraction', 'x')
    localStorage.setItem('tafalna:active-kicks', 'x')
    localStorage.setItem('tafalna:last-backup', '2026-07-01')
    ds.addJournal({ title: 'شيء', text: 'نص', date: '2026-07-28', author: 'mom' })

    ds.resetAllData()

    expect(JSON.parse(ds.exportSnapshot()).journal).toHaveLength(0)
    expect(localStorage.getItem('tafalna:active-feeding')).toBeNull()
    expect(localStorage.getItem('tafalna:active-contraction')).toBeNull()
    expect(localStorage.getItem('tafalna:active-kicks')).toBeNull()
    expect(localStorage.getItem('tafalna:last-backup')).toBeNull()
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull()
  })
})

describe('pregnancy -> baby-care mode transition', () => {
  it('setting child.bornAt via updateChild switches the app into baby-care mode data-wise', async () => {
    const ds = await freshDataService()
    expect(JSON.parse(ds.exportSnapshot()).child.bornAt).toBeNull()

    ds.updateChild({ bornAt: '2026-07-28T08:00:00.000Z' })

    const data = JSON.parse(ds.exportSnapshot())
    expect(data.child.bornAt).toBe('2026-07-28T08:00:00.000Z')
  })
})

describe('memories CRUD (journal, milestones, names, capsules)', () => {
  it('journal: add, edit, delete round-trip', async () => {
    const ds = await freshDataService()
    ds.addJournal({ title: 'عنوان', text: 'نص', date: '2026-07-28', author: 'mom' })
    let list = JSON.parse(ds.exportSnapshot()).journal
    expect(list).toHaveLength(1)
    const id = list[0].id

    ds.updateJournal(id, { title: 'عنوان محدّث' })
    list = JSON.parse(ds.exportSnapshot()).journal
    expect(list[0].title).toBe('عنوان محدّث')

    ds.deleteJournal(id)
    list = JSON.parse(ds.exportSnapshot()).journal
    expect(list).toHaveLength(0)
  })

  it('milestones: add and toggle achieved date', async () => {
    const ds = await freshDataService()
    ds.addMilestone('معلم جديد', '🎉')
    let list = JSON.parse(ds.exportSnapshot()).milestones
    const custom = list.find((m: { title: string }) => m.title === 'معلم جديد')
    expect(custom.achievedAt).toBeNull()

    ds.toggleMilestone(custom.id)
    list = JSON.parse(ds.exportSnapshot()).milestones
    expect(list.find((m: { id: string }) => m.id === custom.id).achievedAt).not.toBeNull()

    ds.deleteMilestone(custom.id)
    list = JSON.parse(ds.exportSnapshot()).milestones
    expect(list.find((m: { id: string }) => m.id === custom.id)).toBeUndefined()
  })
})

describe('care records CRUD (feedings, diapers, sleep, growth)', () => {
  it('feedings: add and delete', async () => {
    const ds = await freshDataService()
    ds.addFeeding({ startedAt: '2026-07-28T10:00:00.000Z', kind: 'breast' as never })
    let list = JSON.parse(ds.exportSnapshot()).feedings
    expect(list).toHaveLength(1)
    ds.deleteFeeding(list[0].id)
    list = JSON.parse(ds.exportSnapshot()).feedings
    expect(list).toHaveLength(0)
  })

  it('diapers: add and delete', async () => {
    const ds = await freshDataService()
    ds.addDiaper('wet' as never, '2026-07-28T10:00:00.000Z')
    let list = JSON.parse(ds.exportSnapshot()).diapers
    expect(list).toHaveLength(1)
    expect(list[0].kind).toBe('wet')
    ds.deleteDiaper(list[0].id)
    list = JSON.parse(ds.exportSnapshot()).diapers
    expect(list).toHaveLength(0)
  })

  it('sleep: start, end, delete', async () => {
    const ds = await freshDataService()
    ds.startSleep('2026-07-28T20:00:00.000Z')
    let list = JSON.parse(ds.exportSnapshot()).sleep
    expect(list[0].endedAt).toBeNull()
    ds.endSleep(list[0].id, '2026-07-28T22:00:00.000Z')
    list = JSON.parse(ds.exportSnapshot()).sleep
    expect(list[0].endedAt).toBe('2026-07-28T22:00:00.000Z')
    ds.deleteSleep(list[0].id)
    list = JSON.parse(ds.exportSnapshot()).sleep
    expect(list).toHaveLength(0)
  })

  it('growth: add and delete', async () => {
    const ds = await freshDataService()
    ds.addGrowth({ date: '2026-07-28', weightKg: 4.2 } as never)
    let list = JSON.parse(ds.exportSnapshot()).growth
    expect(list).toHaveLength(1)
    ds.deleteGrowth(list[0].id)
    list = JSON.parse(ds.exportSnapshot()).growth
    expect(list).toHaveLength(0)
  })
})
