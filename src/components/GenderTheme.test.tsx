import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import GenderTheme from './GenderTheme'
import { useAppData } from '../data/dataService'
import type { AppData, Gender } from '../data/types'

vi.mock('../data/dataService', () => ({ useAppData: vi.fn() }))

const appData = (gender: Gender) =>
  ({ child: { gender } } as unknown as AppData)

describe('ألوان الواجهة حسب جنس الطفل', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.gender
    vi.mocked(useAppData).mockReset()
  })

  it('يبدّل بين الأزرق والوردي ويعيد الوضع المحايد عند اختيار غير معروف', () => {
    vi.mocked(useAppData).mockReturnValue(appData('boy'))
    const view = render(<GenderTheme />)

    expect(document.documentElement.dataset.gender).toBe('boy')

    vi.mocked(useAppData).mockReturnValue(appData('girl'))
    view.rerender(<GenderTheme />)
    expect(document.documentElement.dataset.gender).toBe('girl')

    vi.mocked(useAppData).mockReturnValue(appData('unknown'))
    view.rerender(<GenderTheme />)
    expect(document.documentElement.dataset.gender).toBe('unknown')
  })

  it('يزيل اختيار اللون عند فك المكوّن', () => {
    vi.mocked(useAppData).mockReturnValue(appData('girl'))
    const view = render(<GenderTheme />)

    expect(document.documentElement.dataset.gender).toBe('girl')
    view.unmount()
    expect(document.documentElement.dataset.gender).toBeUndefined()
  })
})
