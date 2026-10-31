import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import * as dataService from '../../data/dataService'
import { emptyData } from '../../data/seed'
import type { StorageAdapter } from '../../data/storage'
import type { Milestone } from '../../data/types'
import LifeEvents from './LifeEvents'

afterEach(() => vi.restoreAllMocks())

let disk = emptyData()
const priorMilestone: Milestone = {
  id: 'prior',
  title: 'أول ابتسامة',
  emoji: '',
  achievedAt: '2026-07-03T12:00:00.000Z',
  builtIn: true,
}

beforeAll(async () => {
  disk = { ...emptyData(), milestones: [priorMilestone] }
  const adapter: StorageAdapter = {
    read: async () => ({ status: 'ok', data: disk }),
    write: async (next) => { disk = next },
    subscribe: () => () => {},
    usage: async () => ({ bytes: 0, limit: null }),
  }
  dataService.setStorageAdapter(adapter)
  await dataService.boot()
})

describe('تسجيل محطة كبيرة', () => {
  it('يبقي محطات الحمل متاحة بعد الولادة داخل مجموعة قابلة للتوسيع', () => {
    render(<LifeEvents stage="child" milestones={[]} />)

    expect(screen.queryByRole('button', { name: 'أول سونار' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'محطات الحمل' }))
    expect(screen.getByRole('button', { name: 'أول سونار' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'معرفة جنس الجنين' })).toBeTruthy()
  })

  it('يحفظ الحدث بتاريخ اختاره الوالدان ولا يرسل أكثر من طلب مع الضغط المتكرر', async () => {
    let finish: (saved: boolean) => void = () => {}
    const pending = new Promise<boolean>((resolve) => {
      finish = resolve
    })
    const save = vi.spyOn(dataService, 'addMilestoneAchieved').mockReturnValue(pending)

    render(<LifeEvents stage="pregnancy" milestones={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'أول سونار' }))

    const date = screen.getByLabelText('تاريخ الحدث') as HTMLInputElement
    fireEvent.change(date, { target: { value: '2026-08-14' } })
    fireEvent.change(screen.getByLabelText('ذكرى عن اللحظة (اختياري)'), {
      target: { value: 'سمعنا النبض معًا' },
    })
    const button = screen.getByRole('button', { name: 'احفظوا الحدث' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(
      'أول سونار',
      expect.stringMatching(/^2026-08-14T/),
      'سمعنا النبض معًا',
    )

    await act(async () => finish(true))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('يبقي التاريخ والذكرى داخل النافذة عند فشل الحفظ', async () => {
    vi.spyOn(dataService, 'addMilestoneAchieved').mockResolvedValue(false)
    render(<LifeEvents stage="child" milestones={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'أول خطوة' }))

    fireEvent.change(screen.getByLabelText('تاريخ الحدث'), {
      target: { value: '2026-08-14' },
    })
    fireEvent.change(screen.getByLabelText('ذكرى عن اللحظة (اختياري)'), {
      target: { value: 'خطوته الأولى في البيت' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'احفظوا الحدث' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/لم يُحفظ الحدث/)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect((screen.getByLabelText('تاريخ الحدث') as HTMLInputElement).value).toBe('2026-08-14')
    expect((screen.getByLabelText('ذكرى عن اللحظة (اختياري)') as HTMLTextAreaElement).value).toBe(
      'خطوته الأولى في البيت',
    )
  })

  it('يتيح تسمية الحدث الخاص قبل حفظه', async () => {
    const save = vi.spyOn(dataService, 'addMilestoneAchieved').mockResolvedValue(true)
    render(<LifeEvents stage="child" milestones={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'حدث خاص' }))
    fireEvent.change(screen.getByLabelText('اسم الحدث'), {
      target: { value: 'أول يوم في الحضانة' },
    })
    fireEvent.change(screen.getByLabelText('تاريخ الحدث'), {
      target: { value: '2026-08-14' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'احفظوا الحدث' }))

    await waitFor(() => expect(save).toHaveBeenCalledWith(
      'أول يوم في الحضانة',
      expect.stringMatching(/^2026-08-14T/),
      undefined,
    ))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('يضيف المحطة الجديدة إلى السجل من دون استبدال ما سُجّل قبلها', async () => {
    const saved = await dataService.addMilestoneAchieved('إعلان الجنس', '2026-08-14T12:00:00.000Z')
    expect(saved).toBe(true)
    expect(disk.milestones).toEqual(
      expect.arrayContaining([
        priorMilestone,
        expect.objectContaining({ title: 'إعلان الجنس', achievedAt: '2026-08-14T12:00:00.000Z' }),
      ]),
    )
  })
})
