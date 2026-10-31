import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import MemoryBook from './MemoryBook'
import { emptyData } from '../../data/seed'
import type { AppData } from '../../data/types'

const state = vi.hoisted(() => ({ data: null as AppData | null }))
vi.mock('../../data/dataService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/dataService')>()
  return { ...actual, useAppData: () => state.data as AppData }
})

function bookData(): AppData {
  const d = emptyData()
  d.child.name = 'سلمان'
  d.child.bornAt = '2026-03-10T08:00:00.000Z'
  d.journal = [
    { id: 'j1', text: 'يوم الزيارة', date: '2026-04-02T10:00:00.000Z', author: 'mom' },
    { id: 'j2', text: 'في السنة الثانية', date: '2027-06-02T10:00:00.000Z', author: 'dad' },
  ]
  d.photos = [
    { id: 'p1', dataUrl: 'data:image/png;base64,AA', date: '2026-04-02T10:05:00.000Z', author: 'mom', memoryId: 'j1', caption: 'مرفقة' },
    { id: 'p2', dataUrl: 'data:image/png;base64,BB', date: '2026-04-03T10:05:00.000Z', author: 'mom', memoryId: 'غائبة', caption: 'يتيمة' },
  ]
  return d
}

describe('كتاب الذكريات', () => {
  it('أجزاء حسب العمر مع فهرس، والصور المربوطة داخل ذكراها والمفقود مرجعه يبقى ظاهرًا', () => {
    state.data = bookData()
    const { container } = render(
      <MemoryRouter>
        <MemoryBook />
      </MemoryRouter>,
    )
    expect(screen.getByRole('navigation', { name: 'فهرس الكتاب' })).toBeTruthy()
    expect(container.querySelector('#part-year-00')).toBeTruthy()
    expect(container.querySelector('#part-year-01')).toBeTruthy()
    // الصورة المرتبطة بذكرى موجودة تظهر مرة واحدة داخل بطاقتها
    expect(container.querySelectorAll('img[alt="مرفقة"]')).toHaveLength(1)
    expect(container.querySelector('.book-entry img[alt="مرفقة"]')).toBeTruthy()
    // الصورة التي ذكراها غير موجودة تُعرض مستقلة ولا تضيع
    expect(screen.getByAltText('يتيمة')).toBeTruthy()
  })

  it('دون أجزاء متعددة لا فهرس', () => {
    const d = bookData()
    d.journal = [d.journal[0]!]
    d.photos = []
    state.data = d
    render(
      <MemoryRouter>
        <MemoryBook />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('navigation', { name: 'فهرس الكتاب' })).toBeNull()
  })
})
