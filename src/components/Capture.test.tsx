import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CaptureProvider, useCapture } from './Capture'
import { promptsForToday } from '../lib/prompts'
import { boot, exportSnapshot, updateJournal } from '../data/dataService'
import { emptyData } from '../data/seed'
import * as dataService from '../data/dataService'
import type { AppData } from '../data/types'

// =============================================================
// نافذة التوثيق في وضع الحمل.
//
// لا نُقلع طبقة البيانات هنا: بيانات فارغة تعني `bornAt = null`،
// وهو بالضبط وضع الحمل الذي تحرسه هذه الاختبارات.
// =============================================================

function OpenButton() {
  const { open } = useCapture()
  return <button onClick={() => open()}>افتحوا التوثيق</button>
}

function renderCapture() {
  render(
    <MemoryRouter>
      <CaptureProvider>
        <OpenButton />
      </CaptureProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'افتحوا التوثيق' }))
}

const ideas = promptsForToday(false)

beforeAll(async () => {
  const seeded = emptyData()
  localStorage.setItem('tafalna:v2', JSON.stringify(seeded))
  await boot()
})

const snapshot = (): AppData => JSON.parse(exportSnapshot()) as AppData

describe('نافذة التوثيق — الفتح والإغلاق', () => {
  it('تفتح على شاشة الاختيارات وتُغلق بزر الإغلاق', () => {
    renderCapture()

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'وش ودّكم تحفظون؟' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('لا تعرض زرّ رجوع على شاشة الاختيارات — هي أول الطريق', () => {
    renderCapture()

    expect(screen.queryByRole('button', { name: 'رجوع' })).toBeNull()
  })
})

describe('الذكرى السريعة والمواعيد', () => {
  it('تعرض الذكرى السريعة وموعدًا جديدًا مباشرةً في شاشة الالتقاط', () => {
    renderCapture()

    expect(screen.getByRole('button', { name: /ذكرى سريعة/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /موعد جديد/ })).toBeTruthy()
  })

  it('يحفظ نصًا بلا عنوان في اليوميات ويظل قابلًا للتحرير', async () => {
    const before = snapshot().journal.length
    renderCapture()
    fireEvent.click(screen.getByRole('button', { name: /ذكرى سريعة/ }))

    const note = screen.getByLabelText('الذكرى') as HTMLTextAreaElement
    fireEvent.change(note, { target: { value: 'اشترينا أول ملابس له اليوم' } })
    const save = screen.getByRole('button', { name: 'حفظ الذكرى' })
    fireEvent.click(save)
    fireEvent.click(save)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const saved = snapshot().journal
    expect(saved).toHaveLength(before + 1)
    expect(saved[0]).toMatchObject({
      text: 'اشترينا أول ملابس له اليوم',
      author: 'mom',
    })
    expect(saved[0].title).toBeUndefined()

    await updateJournal(saved[0].id, { text: 'عدّلنا ذكرى الملابس' })
    expect(snapshot().journal[0]).toMatchObject({ id: saved[0].id, text: 'عدّلنا ذكرى الملابس' })
  })

  it('يبقي الذكرى مفتوحة ونصها كما هو إذا تعذّر الحفظ', async () => {
    const save = vi.spyOn(dataService, 'addJournal').mockResolvedValue(false)
    renderCapture()
    fireEvent.click(screen.getByRole('button', { name: /ذكرى سريعة/ }))

    const note = screen.getByLabelText('الذكرى') as HTMLTextAreaElement
    fireEvent.change(note, { target: { value: 'زرنا المستشفى اليوم' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الذكرى' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/لم تُحفظ/))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(note.value).toBe('زرنا المستشفى اليوم')
    expect(screen.queryByText('حُفظت الذكرى')).toBeNull()
    save.mockRestore()
  })
})

describe('فكرة لليوم', () => {
  it('«فكرة ثانية» تنقل إلى فكرة اليوم التالية', () => {
    renderCapture()

    expect(screen.getByText(ideas[0])).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'فكرة ثانية' }))

    expect(screen.getByText(ideas[1])).toBeTruthy()
    expect(screen.queryByText(ideas[0])).toBeNull()
  })

  it('«اكتبوا عنها» تفتح الرسالة وقد امتلأ عنوانها بالفكرة', () => {
    renderCapture()

    fireEvent.click(screen.getByRole('button', { name: 'اكتبوا عنها' }))

    expect(screen.getByRole('heading', { name: 'رسالة' })).toBeTruthy()
    const title = screen.getByLabelText('عنوان (اختياري)') as HTMLInputElement
    expect(title.value).toBe(ideas[0])
  })
})

describe('زرّ الرجوع من النموذج إلى الاختيارات', () => {
  it('يرجع إلى الاختيارات دون إغلاق النافذة، والإغلاق باقٍ بجانبه', () => {
    renderCapture()

    fireEvent.click(screen.getByRole('button', { name: /^صورة/ }))
    expect(screen.getByRole('heading', { name: 'صورة' })).toBeTruthy()
    // ⚠️ الانحدار الذي يحرسه هذا الاختبار: من اختار النوع الخطأ كان
    // مضطرًّا لإغلاق النافذة وفتحها من جديد.
    expect(screen.getByRole('button', { name: 'إغلاق' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'رجوع' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'وش ودّكم تحفظون؟' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'رجوع' })).toBeNull()
  })

  it('ينسى ما عُبّئ مسبقًا فلا يعود العنوان القديم مع اختيار جديد', () => {
    renderCapture()

    fireEvent.click(screen.getByRole('button', { name: 'اكتبوا عنها' }))
    fireEvent.click(screen.getByRole('button', { name: 'رجوع' }))
    fireEvent.click(screen.getByRole('button', { name: /^رسالةبالكلمات/ }))

    const title = screen.getByLabelText('عنوان (اختياري)') as HTMLInputElement
    expect(title.value).toBe('')
  })
})

describe('المتابعة السريعة — وضع الحمل', () => {
  const toggle = () => screen.getByRole('button', { name: /المتابعة السريعة/ })

  it('تُفتح وتُطوى بضغطة على عنوانها', () => {
    renderCapture()

    expect(toggle().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'ركلة' })).toBeNull()

    fireEvent.click(toggle())

    expect(toggle().getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: 'ركلة' })).toBeTruthy()

    fireEvent.click(toggle())

    expect(toggle().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'ركلة' })).toBeNull()
  })

  it('تعرض أزرارها الأربعة في صفّين متساويين ٢×٢', () => {
    renderCapture()
    fireEvent.click(toggle())

    const grid = screen.getByRole('button', { name: 'ركلة' }).parentElement!
    expect(grid.className).toContain('grid-cols-6')

    const buttons = Array.from(grid.children)
    expect(buttons).toHaveLength(4)
    // ⚠️ الانحدار: أربعة أزرار في شبكة ثلاثية كانت تُعرض ٣+١
    for (const b of buttons) expect(b.className).toContain('col-span-3')
  })
})
