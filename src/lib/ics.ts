import type { Appointment } from '../data/types'

// تصدير موعد إلى ملف تقويم قياسي (.ics) ليُضاف لتقويم الجوال
// ويصل تنبيهه عبر التقويم نفسه — أبسط من إشعارات الويب وأكثر موثوقية.

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** صيغة UTC المطلوبة في iCalendar: 20260728T103000Z */
function toICSDate(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** يهرّب المحارف الخاصة حسب مواصفة iCalendar */
function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** حدّ السطر في iCalendar: ٧٥ ثمانية (octet) لا ٧٥ حرفًا */
const MAX_OCTETS = 75
const encoder = new TextEncoder()

/**
 * يطوي السطور الطويلة حسب RFC 5545.
 *
 * الحدّ يُقاس بالبايتات لا بالحروف، والحرف العربي بايتان في UTF-8 — فعنوان
 * موعد من ٤٠ حرفًا يتجاوز الحدّ وحده. المتساهلون من قارئي التقويم يقبلونه،
 * والمتشدّدون يرفضون الملف كله فلا يُضاف الموعد أصلًا.
 *
 * الطيّ يكون بين المحارف لا داخلها: قصّ منتصف حرف متعدّد البايتات يفسد
 * الترميز ويحوّل العنوان إلى رموز.
 */
function foldLine(line: string): string {
  const out: string[] = []
  let current = ''
  let octets = 0
  // أول سطر يسع ٧٥، وما بعده يبدأ بمسافة فيسع ٧٤
  let limit = MAX_OCTETS

  for (const char of line) {
    const size = encoder.encode(char).length
    if (octets + size > limit) {
      out.push(current)
      current = ''
      octets = 0
      limit = MAX_OCTETS - 1
    }
    current += char
    octets += size
  }
  out.push(current)
  return out.join('\r\n ')
}

export function appointmentToICS(a: Appointment): string {
  const start = new Date(a.dateTime)
  const end = new Date(start.getTime() + 60 * 60 * 1000) // ساعة افتراضية
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tafalna//AR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${a.id}@tafalna`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeText(a.title)}`,
    a.location ? `LOCATION:${escapeText(a.location)}` : '',
    a.notes ? `DESCRIPTION:${escapeText(a.notes)}` : '',
    // تذكير قبل الموعد بيوم
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(a.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .map(foldLine)
    .join('\r\n')
}

export function downloadAppointmentICS(a: Appointment): void {
  const blob = new Blob([appointmentToICS(a)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${a.title.replace(/[\\/:*?"<>|]/g, '-')}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
