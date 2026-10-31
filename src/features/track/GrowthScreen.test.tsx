import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GrowthScreen from './GrowthScreen'
import { emptyData } from '../../data/seed'
import type { AppData } from '../../data/types'

const h = vi.hoisted(() => ({ data: null as AppData | null, addGrowth: vi.fn() }))
vi.mock('../../data/dataService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/dataService')>()
  return { ...actual, useAppData: () => h.data as AppData, addGrowth: h.addGrowth }
})

beforeEach(() => {
  h.addGrowth.mockReset()
  const d = emptyData()
  d.child.bornAt = '2025-01-10T08:00:00.000Z'
  h.data = d
})

describe('قياسات النمو', () => {
  it('يرفض قيمة مستحيلة برسالة ولا يحفظها، ويقبل قيمة معقولة', () => {
    render(
      <MemoryRouter>
        <GrowthScreen />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /قياس|أضف/ })[0]!)
    const weight = screen.getByPlaceholderText('4.2')
    fireEvent.change(weight, { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ القياس' }))
    expect(screen.getByRole('alert').textContent).toContain('الوزن')
    expect(h.addGrowth).not.toHaveBeenCalled()

    fireEvent.change(weight, { target: { value: '12.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ القياس' }))
    expect(h.addGrowth).toHaveBeenCalledTimes(1)
  })
})
