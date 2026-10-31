import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Track from './Track'
import { CaptureProvider } from '../../components/Capture'
import { emptyData } from '../../data/seed'
import type { AppData } from '../../data/types'
import { resetTrackPrefsForTests, setToolHidden } from '../../lib/trackPrefs'

const state = vi.hoisted(() => ({ data: null as AppData | null }))

vi.mock('../../data/dataService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/dataService')>()
  return { ...actual, useAppData: () => state.data as AppData }
})

beforeEach(() => {
  localStorage.clear()
  resetTrackPrefsForTests()
  const data = emptyData()
  data.setupComplete = true
  data.child.lmpDate = new Date(Date.now() - 22 * 7 * 86400000).toISOString()
  data.kicks = [{ id: 'k1', startedAt: new Date().toISOString(), endedAt: null, count: 3 }] as AppData['kicks']
  state.data = data
})

describe('إخفاء أدوات المتابعة', () => {
  it('الإخفاء عرض فقط: الأداة تغيب ثم تعود وسجلاتها كما هي، والأدوية لا تُخفى', () => {
    render(
      <MemoryRouter>
        <CaptureProvider><Track /></CaptureProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('الركلات')).toBeTruthy()

    act(() => setToolHidden('kicks', true))
    expect(screen.queryByText('الركلات')).toBeNull()
    expect(state.data!.kicks).toHaveLength(1)
    expect(screen.getByText('الأدوية والعلاج')).toBeTruthy()

    act(() => setToolHidden('kicks', false))
    expect(screen.getByText('الركلات')).toBeTruthy()
  })

  it('إخفاء كل أدوات قسم مطوي يخفي القسم كله', () => {
    render(
      <MemoryRouter>
        <CaptureProvider><Track /></CaptureProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('أدوات إضافية وسجلاتها')).toBeTruthy()
    act(() => {
      setToolHidden('development', true)
      setToolHidden('contractions', true)
      setToolHidden('kicks', true)
    })
    expect(screen.queryByText('أدوات إضافية وسجلاتها')).toBeNull()
  })
})
