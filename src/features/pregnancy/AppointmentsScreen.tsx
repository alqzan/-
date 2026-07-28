import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { CalendarIcon, DownloadIcon, PlusIcon, TrashIcon } from '../../components/icons'
import {
  addAppointment,
  deleteAppointment,
  useAppData,
} from '../../data/dataService'
import type { Appointment, AppointmentType } from '../../data/types'
import { formatDate, formatTime } from '../../lib/format'
import { fileToDataUrl } from '../../lib/image'
import { downloadAppointmentICS } from '../../lib/ics'

const TYPE_LABEL: Record<AppointmentType, string> = {
  checkup: 'متابعة',
  ultrasound: 'سونار',
  lab: 'تحليل',
  other: 'أخرى',
}
const TYPE_EMOJI: Record<AppointmentType, string> = {
  checkup: '🩺',
  ultrasound: '🖼️',
  lab: '🧪',
  other: '📌',
}

export default function AppointmentsScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const { confirm, dialog } = useConfirm()

  const sorted = [...data.appointments].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
  )
  const now = Date.now()
  const upcoming = sorted.filter((a) => new Date(a.dateTime).getTime() >= now)
  const past = sorted.filter((a) => new Date(a.dateTime).getTime() < now).reverse()

  return (
    <>
      <ScreenHeader
        title="المواعيد والفحوصات"
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-sage-400 text-white shadow-soft"
            aria-label="إضافة موعد"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      {sorted.length === 0 && (
        <EmptyState
          icon={<CalendarIcon className="w-8 h-8" />}
          title="لا مواعيد بعد"
          hint="أضيفوا مواعيد المتابعة والسونار لتذكيركم بها."
          action={<Button onClick={() => setOpen(true)}>إضافة موعد</Button>}
        />
      )}

      {upcoming.length > 0 && <h2 className="section-title mt-2 mb-3">القادمة</h2>}
      <div className="space-y-2">
        {upcoming.map((a) => (
          <AppointmentCard
            key={a.id}
            a={a}
            onDelete={() =>
              confirm({
                title: 'حذف هذا الموعد؟',
                message: a.image ? 'ستُحذف معه الصورة المرفقة.' : undefined,
                confirmLabel: 'حذف الموعد',
                onConfirm: () => deleteAppointment(a.id),
              })
            }
          />
        ))}
      </div>

      {past.length > 0 && <h2 className="section-title mt-6 mb-3">السابقة</h2>}
      <div className="space-y-2 opacity-70">
        {past.map((a) => (
          <AppointmentCard
            key={a.id}
            a={a}
            onDelete={() =>
              confirm({
                title: 'حذف هذا الموعد؟',
                message: a.image ? 'ستُحذف معه الصورة المرفقة.' : undefined,
                confirmLabel: 'حذف الموعد',
                onConfirm: () => deleteAppointment(a.id),
              })
            }
          />
        ))}
      </div>

      <AddAppointmentSheet open={open} onClose={() => setOpen(false)} />
      {dialog}
    </>
  )
}

function AppointmentCard({ a, onDelete }: { a: Appointment; onDelete: () => void }) {
  const upcoming = new Date(a.dateTime).getTime() >= Date.now()
  return (
    <Card className="!p-3.5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-sky-100 grid place-items-center text-xl shrink-0">
          {TYPE_EMOJI[a.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sage-800">{a.title}</span>
            <span className="chip !py-0.5 !text-xs">{TYPE_LABEL[a.type]}</span>
          </div>
          <div className="text-sm text-sage-500 mt-0.5">
            {formatDate(a.dateTime)} • {formatTime(a.dateTime)}
          </div>
          {a.location && <div className="text-xs text-sage-400 mt-0.5">📍 {a.location}</div>}
          {a.notes && <div className="text-sm text-sage-600 mt-1.5">{a.notes}</div>}
          {a.image && (
            <img src={a.image} alt="مرفق" className="mt-2 rounded-xl max-h-40 object-cover w-full" />
          )}
          {upcoming && (
            <button
              onClick={() => downloadAppointmentICS(a)}
              className="chip !bg-cream-200 !text-sage-600 !text-xs mt-2"
            >
              <DownloadIcon className="w-4 h-4" /> أضف للتقويم
            </button>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-sage-300 hover:text-red-600 p-1"
          aria-label="حذف"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </Card>
  )
}

function AddAppointmentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<AppointmentType>('checkup')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [image, setImage] = useState<string | null>(null)

  function reset() {
    setTitle('')
    setType('checkup')
    setDate('')
    setTime('')
    setLocation('')
    setNotes('')
    setImage(null)
  }

  function submit() {
    if (!title.trim() || !date) return
    const dateTime = new Date(`${date}T${time || '09:00'}`).toISOString()
    addAppointment({ title: title.trim(), type, dateTime, location, notes, image })
    reset()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="موعد جديد">
      <Field label="العنوان">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: سونار الأسبوع 24" />
      </Field>
      <Field label="النوع">
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(TYPE_LABEL) as AppointmentType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-2xl py-2.5 text-sm border ${
                type === t ? 'bg-sage-400 text-white border-sage-400' : 'bg-white border-cream-300 text-sage-600'
              }`}
            >
              <div>{TYPE_EMOJI[t]}</div>
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex gap-3">
        <Field label="التاريخ">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="الوقت">
          <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="المكان (اختياري)">
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="اسم المستشفى/العيادة" />
      </Field>
      <Field label="ملاحظات (اختياري)">
        <textarea className="input min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Field label="صورة السونار/الفحص (اختياري)">
        <input
          type="file"
          accept="image/*"
          className="text-sm text-sage-500"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) setImage(await fileToDataUrl(f))
          }}
        />
        {image && <img src={image} alt="معاينة" className="mt-2 rounded-xl max-h-40 object-cover w-full" />}
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!title.trim() || !date}>
        حفظ الموعد
      </Button>
    </Sheet>
  )
}
