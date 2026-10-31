import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

it('waits for IndexedDB transaction completion before reporting audio persisted', async () => {
  vi.resetModules()
  const request = { result: 'key', error: null, onsuccess: null as null | (() => void) }
  const transaction = {
    objectStore: () => ({ put: () => request }),
    oncomplete: null as null | (() => void),
    onabort: null as null | (() => void),
    error: null,
  }
  const openRequest = {
    result: { transaction: () => transaction },
    onsuccess: null as null | (() => void),
  }
  vi.stubGlobal('indexedDB', { open: () => openRequest })
  const { putAudio } = await import('./mediaStore')
  let saved = false
  const pending = putAudio('key', new Blob(['audio'])).then(() => { saved = true })
  openRequest.onsuccess!()
  await Promise.resolve()
  request.onsuccess?.()
  await Promise.resolve()
  expect(saved).toBe(false)
  transaction.oncomplete!()
  await pending
  expect(saved).toBe(true)
})

it('rejects a transaction that aborts even after its request succeeded', async () => {
  vi.resetModules()
  const request = { result: 'key', error: null, onsuccess: null as null | (() => void) }
  const transaction = {
    objectStore: () => ({ put: () => request }),
    oncomplete: null as null | (() => void),
    onabort: null as null | (() => void),
    error: new Error('disk failed'),
  }
  const openRequest = { result: { transaction: () => transaction }, onsuccess: null as null | (() => void) }
  vi.stubGlobal('indexedDB', { open: () => openRequest })
  const { putAudio } = await import('./mediaStore')
  const pending = putAudio('key', new Blob(['audio']))
  const failure = expect(pending).rejects.toThrow('disk failed')
  openRequest.onsuccess!()
  await Promise.resolve()
  request.onsuccess?.()
  transaction.onabort!()
  await failure
})
