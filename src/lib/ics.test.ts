import { describe, expect, it } from 'vitest'
import { appointmentToICS } from './ics'
import type { Appointment } from '../data/types'

function makeAppointment(patch: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    title: 'فحص السونار',
    dateTime: '2026-07-28T10:30:00.000Z',
    type: 'ultrasound',
    ...patch,
  }
}

const encoder = new TextEncoder()

describe('appointmentToICS', () => {
  it('يكتب الوقت بصيغة UTC المطلوبة', () => {
    expect(appointmentToICS(makeAppointment())).toContain('DTSTART:20260728T103000Z')
  })

  it('يطوي كل سطر عند ٧٥ ثمانية — والحرف العربي بايتان', () => {
    // عنوان من ٦٠ حرفًا عربيًا = ١٢٠ بايت، يتجاوز الحدّ وحده
    const title = 'موعد'.repeat(15)
    const ics = appointmentToICS(makeAppointment({ title }))

    for (const line of ics.split('\r\n')) {
      expect(encoder.encode(line).length, `طول السطر: ${line}`).toBeLessThanOrEqual(75)
    }
  })

  it('لا يقصّ حرفًا عربيًا في منتصفه عند الطيّ', () => {
    const title = 'ذكرى'.repeat(30)
    const ics = appointmentToICS(makeAppointment({ title }))

    // فكّ الطيّ (CRLF + مسافة) يجب أن يعيد العنوان كما هو بلا رموز مشوّهة
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain(`SUMMARY:${title}`)
    expect(unfolded).not.toContain('�')
  })

  it('يهرّب المحارف التي لها معنى في المواصفة', () => {
    // الفاصلة العربية «،» ليست منها — تمرّ كما هي
    const ics = appointmentToICS(makeAppointment({ title: 'فحص، ومتابعة; ثم, أخرى' }))
    expect(ics.replace(/\r\n /g, '')).toContain('SUMMARY:فحص، ومتابعة\\; ثم\\, أخرى')
  })
})
