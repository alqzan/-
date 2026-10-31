import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PregnancyAgeEditor from './PregnancyAgeEditor'
import { updateChild, useAppData } from '../data/dataService'
import type { AppData } from '../data/types'
import { localDateInputValue } from '../lib/localDate'

vi.mock('../data/dataService', () => ({
  updateChild: vi.fn(),
  useAppData: vi.fn(),
}))

const childData = {
  child: {
    name: 'طفلنا',
    gender: 'unknown',
    lmpDate: null,
    dueDate: null,
    bornAt: null,
    parents: { momName: '', dadName: '' },
  },
} as unknown as AppData

describe('محرر عمر الحمل حسب آخر زيارة', () => {
  beforeEach(() => {
    vi.mocked(useAppData).mockReturnValue(childData)
    vi.mocked(updateChild).mockReset()
  })

  it('يعرض معاينة عمر اليوم والموعد، ويرفض القيم الناقصة أو خارج الحدود', () => {
    render(<PregnancyAgeEditor />)
    fireEvent.click(screen.getByRole('button', { name: /تعديل عمر الحمل حسب آخر زيارة/ }))

    const save = screen.getByRole('button', { name: 'حفظ عمر الحمل' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)

    const visit = screen.getByLabelText('تاريخ الزيارة')
    fireEvent.change(visit, { target: { value: '' } })
    expect(save.disabled).toBe(true)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    fireEvent.change(visit, { target: { value: localDateInputValue(tomorrow) } })
    fireEvent.change(screen.getByLabelText('الأسابيع المكتملة (٠–٤٥)'), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText('الأيام الإضافية (٠–٦)'), { target: { value: '3' } })
    expect(save.disabled).toBe(true)

    fireEvent.change(visit, { target: { value: localDateInputValue() } })
    fireEvent.change(screen.getByLabelText('الأسابيع المكتملة (٠–٤٥)'), { target: { value: '46' } })
    fireEvent.change(screen.getByLabelText('الأيام الإضافية (٠–٦)'), { target: { value: '7' } })
    expect(save.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('الأسابيع المكتملة (٠–٤٥)'), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText('الأيام الإضافية (٠–٦)'), { target: { value: '3' } })
    expect(screen.getByText(/عمر الحمل اليوم:/)).toBeTruthy()
    expect(screen.getByText(/موعد الولادة المتوقع:/)).toBeTruthy()
    expect(save.disabled).toBe(false)
  })

  it('يبقي النافذة مفتوحة ويعرض خطأ لطيفًا إذا فشل الحفظ', async () => {
    vi.mocked(updateChild).mockResolvedValue(false)
    render(<PregnancyAgeEditor />)
    fireEvent.click(screen.getByRole('button', { name: /تعديل عمر الحمل حسب آخر زيارة/ }))
    fireEvent.change(screen.getByLabelText('تاريخ الزيارة'), { target: { value: localDateInputValue() } })
    fireEvent.change(screen.getByLabelText('الأسابيع المكتملة (٠–٤٥)'), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText('الأيام الإضافية (٠–٦)'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ عمر الحمل' }))

    expect((await screen.findByRole('alert')).textContent).toContain('لم يُحفظ التعديل على هذا الجهاز')
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(updateChild).toHaveBeenCalledTimes(1)
    expect(updateChild).toHaveBeenCalledWith({
      lmpDate: expect.any(String),
      dueDate: expect.any(String),
    })
    expect(screen.getByRole('button', { name: /تعديل عمر الحمل حسب آخر زيارة/ }).textContent).not.toContain('تم الحفظ')
  })

  it('يغلق النافذة ويعلن نجاحًا بعد تأكيد الحفظ فقط', async () => {
    vi.mocked(updateChild).mockResolvedValue(true)
    render(<PregnancyAgeEditor />)
    fireEvent.click(screen.getByRole('button', { name: /تعديل عمر الحمل حسب آخر زيارة/ }))
    fireEvent.change(screen.getByLabelText('تاريخ الزيارة'), { target: { value: localDateInputValue() } })
    fireEvent.change(screen.getByLabelText('الأسابيع المكتملة (٠–٤٥)'), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText('الأيام الإضافية (٠–٦)'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ عمر الحمل' }))

    await screen.findByText('تم حفظ عمر الحمل.')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(updateChild).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /تعديل عمر الحمل حسب آخر زيارة/ }).textContent).toContain('تم حفظ عمر الحمل.')
  })
})
