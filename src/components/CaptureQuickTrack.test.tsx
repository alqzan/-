import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CaptureProvider, useCapture } from './Capture'
import { boot, exportSnapshot } from '../data/dataService'
import { emptyData } from '../data/seed'
import type { AppData } from '../data/types'

// =============================================================
// المتابعة السريعة في وضع ما بعد الولادة.
//
// نزرع مولودًا في التخزين قبل الإقلاع كي يعرض القسم أزرار الرعاية
// (رضعة، حفاض، نوم) لا أزرار الحمل.
// =============================================================

beforeAll(async () => {
  const seeded = emptyData()
  seeded.setupComplete = true
  seeded.child.bornAt = new Date().toISOString()
  localStorage.setItem('tafalna:v2', JSON.stringify(seeded))
  await boot()
})

function OpenButton() {
  const { open } = useCapture()
  return <button onClick={() => open()}>افتحوا التوثيق</button>
}

function openQuickTrack() {
  render(
    <MemoryRouter>
      <CaptureProvider>
        <OpenButton />
      </CaptureProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'افتحوا التوثيق' }))
  fireEvent.click(screen.getByRole('button', { name: /المتابعة السريعة/ }))
}

const snapshot = (): AppData => JSON.parse(exportSnapshot()) as AppData

describe('المتابعة السريعة — وضع ما بعد الولادة', () => {
  it('تسمّي ما تحفظه الضغطة صراحةً بدل قيمة افتراضية مخفيّة', () => {
    openQuickTrack()

    expect(screen.getByRole('button', { name: 'رضعة طبيعية' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'حفاض مبلل' })).toBeTruthy()
  })

  it('توزّع أزرارها الخمسة على صفّين ممتلئين: ٣ ثم ٢ ممدودين', () => {
    openQuickTrack()

    const grid = screen.getByRole('button', { name: 'رضعة طبيعية' }).parentElement!
    const buttons = Array.from(grid.children)
    expect(buttons).toHaveLength(5)

    for (const b of buttons.slice(0, 3)) expect(b.className).toContain('col-span-2')
    for (const b of buttons.slice(3)) expect(b.className).toContain('col-span-3')
  })

  it('لا تسجّل رضعتين عند النقر المزدوج السريع', async () => {
    const before = snapshot().feedings.length
    openQuickTrack()

    const feed = screen.getByRole('button', { name: 'رضعة طبيعية' })
    // ⚠️ الانحدار الذي يحرسه هذا الاختبار: النقرة الثانية قبل أن
    // تُغلق النافذة كانت تسجّل رضعة ثانية لا وجود لها.
    fireEvent.click(feed)
    fireEvent.click(feed)

    await waitFor(() => expect(screen.getByText('سُجّلت رضعة طبيعية')).toBeTruthy())
    expect(snapshot().feedings.length).toBe(before + 1)
  })

  it('لا تسجّل حفاضين عند النقر المزدوج السريع', async () => {
    const before = snapshot().diapers.length
    openQuickTrack()

    const diaper = screen.getByRole('button', { name: 'حفاض مبلل' })
    fireEvent.click(diaper)
    fireEvent.click(diaper)

    await waitFor(() => expect(screen.getByText('سُجّل حفاض مبلل')).toBeTruthy())
    expect(snapshot().diapers.length).toBe(before + 1)
  })
})
