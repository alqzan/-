import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { emptyData } from './data/seed'
import type { AppData } from './data/types'

const state = vi.hoisted(() => ({ data: null as AppData | null }))

vi.mock('./data/dataService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./data/dataService')>()
  return {
    ...actual,
    useAppData: () => state.data as AppData,
    useDataStatus: () => ({ loading: false, error: null, readOnly: false }),
  }
})

vi.mock('./data/FamilySyncBridge', () => ({ default: () => null }))

function readyData(born: boolean): AppData {
  const data = emptyData()
  data.setupComplete = true
  data.child.name = 'سلمان'
  if (born) data.child.bornAt = new Date(Date.now() - 14 * 86400000).toISOString()
  else data.child.lmpDate = new Date(Date.now() - 22 * 7 * 86400000).toISOString()
  return data
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('التنقّل الرئيسي', () => {
  beforeEach(() => {
    state.data = readyData(false)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('يفتح المتابعة من الجذر ويعرض الحمل ومحرر الزيارة مع تبويبين فقط', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'المتابعة' })).toBeTruthy()
    expect(screen.getByText('22', { exact: true })).toBeTruthy()
    expect(screen.getByRole('button', { name: /تعديل عمر الحمل حسب آخر زيارة/ })).toBeTruthy()
    expect(screen.getByText('الصحة والمواعيد')).toBeTruthy()
    const extraTools = screen.getByText('أدوات إضافية وسجلاتها').closest('details') as HTMLDetailsElement
    expect(extraTools.open).toBe(false)
    fireEvent.click(screen.getByText('أدوات إضافية وسجلاتها'))
    expect(extraTools.open).toBe(true)
    expect(screen.getByRole('button', { name: /تطوّر الجنين/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /الانقباضات/ })).toBeTruthy()
    const pregnancyPrep = screen.getByText('التجهيزات').closest('details') as HTMLDetailsElement
    expect(pregnancyPrep.open).toBe(false)
    fireEvent.click(screen.getByText('التجهيزات'))
    expect(pregnancyPrep.open).toBe(true)
    expect(screen.getByRole('button', { name: /الأسماء/ })).toBeTruthy()

    const nav = screen.getByRole('navigation', { name: 'التنقّل الرئيسي' })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(within(nav).getByRole('link', { name: 'المتابعة' }).getAttribute('href')).toBe('/')
    expect(within(nav).getByRole('link', { name: 'الذكريات' }).getAttribute('href')).toBe('/story')
    expect(screen.getByRole('button', { name: 'توثيق لحظة' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'الإعدادات' })).toBeTruthy()
  })

  it('يعرض ملخص المولود والتطعيمات عند فتح المتابعة مباشرة', () => {
    state.data = readyData(true)
    renderAt('/track')

    expect(screen.getByRole('heading', { name: 'المتابعة' })).toBeTruthy()
    expect(screen.getByText('سلمان')).toBeTruthy()
    expect(screen.getByText('التطعيمات')).toBeTruthy()
    const babyPrep = screen.getByText('التجهيزات').closest('details') as HTMLDetailsElement
    expect(babyPrep.open).toBe(false)
    fireEvent.click(screen.getByText('التجهيزات'))
    expect(babyPrep.open).toBe(true)
    expect(screen.getByRole('button', { name: /مشتريات المولود/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /تعديل عمر الحمل حسب آخر زيارة/ })).toBeNull()
  })

  it('يعاين الثيم أثناء البداية دون تعديل بيانات الطفل قبل الحفظ', () => {
    state.data = emptyData()
    renderAt('/')
    fireEvent.click(screen.getByRole('radio', { name: 'بنت' }))
    expect(document.documentElement.dataset.gender).toBe('girl')
    expect(state.data.child.gender).toBe('unknown')
    expect(state.data.setupComplete).toBe(false)
  })

  it('يبقي شاشة اليوم القديمة متاحة دون إضافة تبويب ثالث', () => {
    renderAt('/today')

    expect(screen.getByText('سؤال اليوم')).toBeTruthy()
    expect(within(screen.getByRole('navigation', { name: 'التنقّل الرئيسي' })).getAllByRole('link')).toHaveLength(2)
  })
})
