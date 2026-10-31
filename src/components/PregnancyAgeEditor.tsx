import { useRef, useState } from 'react'
import { Button, Field, Sheet } from './ui'
import { updateChild, useAppData } from '../data/dataService'
import { formatDate } from '../lib/format'
import { localDateInputValue, localDateToIso } from '../lib/localDate'
import { gestationLabel, getPregnancyProgress, lmpFromGestation } from '../lib/pregnancy'
import { useNow } from '../lib/useNow'

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && localDateInputValue(date) === value
}

export default function PregnancyAgeEditor() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const [visit, setVisit] = useState(localDateInputValue())
  const [week, setWeek] = useState('')
  const [day, setDay] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savingRef = useRef(false)

  const now = useNow(60000)
  const current = getPregnancyProgress(data.child.lmpDate, data.child.dueDate, new Date(now))
  const weekNum = Number(week)
  const dayNum = Number(day)
  const today = localDateInputValue(new Date(now))
  const validVisit = isRealDate(visit) && visit <= today
  const validWeek = week.trim() !== '' && Number.isInteger(weekNum) && weekNum >= 0 && weekNum <= 45
  const validDay = day.trim() !== '' && Number.isInteger(dayNum) && dayNum >= 0 && dayNum <= 6
  const valid = validVisit && validWeek && validDay

  const dates = valid
    ? lmpFromGestation(weekNum, dayNum, localDateToIso(visit))
    : null
  const preview = dates
    ? getPregnancyProgress(dates.lmpDate, null, new Date(now))
    : null

  function close() {
    if (!savingRef.current) setOpen(false)
  }

  async function submit() {
    if (savingRef.current || !valid || !dates) return
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      const persisted = await updateChild({ lmpDate: dates.lmpDate, dueDate: dates.dueDate })
      if (!persisted) {
        setError('لم يُحفظ التعديل على هذا الجهاز. تحقّقوا من المساحة وحاولوا مجددًا.')
        return
      }
      setSaved(true)
      setOpen(false)
    } catch {
      setError('تعذّر حفظ التعديل. حاولوا مجددًا.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
        className="w-full min-h-[44px] rounded-2xl border border-line bg-paper-100 px-4 py-3
                   text-right transition active:scale-[0.99]"
      >
        <span className="block text-[14px] font-medium text-ink-700">
          تعديل عمر الحمل حسب آخر زيارة
        </span>
        <span className="block text-[11px] text-ink-400 mt-0.5 leading-relaxed">
          {saved
            ? current
              ? `تم الحفظ — عمر الحمل اليوم ${gestationLabel(current.week, current.dayOfWeek)}`
              : 'تم حفظ عمر الحمل.'
            : 'أدخلوا عمر الحمل كما ورد في تقرير آخر زيارة للطبيبة.'}
        </span>
      </button>

      <Sheet
        open={open}
        onClose={close}
        title="تعديل عمر الحمل حسب آخر زيارة"
        subtitle="اكتبوا الأسبوع واليوم كما في تقرير الطبيبة أو السونار."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Field label="تاريخ الزيارة">
            <input
              type="date"
              className="input"
              value={visit}
              max={today}
              onChange={(event) => setVisit(event.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="الأسابيع المكتملة (٠–٤٥)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={45}
                step={1}
                className="input"
                value={week}
                onChange={(event) => setWeek(event.target.value)}
                placeholder="24"
                required
              />
            </Field>
            <Field label="الأيام الإضافية (٠–٦)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={6}
                step={1}
                className="input"
                value={day}
                onChange={(event) => setDay(event.target.value)}
                placeholder="3"
                required
              />
            </Field>
          </div>

          {preview && dates && (
            <p className="text-[12px] text-ink-500 bg-white rounded-2xl border border-line p-3 mb-3 leading-relaxed">
              عمر الحمل اليوم:{' '}
              <strong className="text-ink-800">{gestationLabel(preview.week, preview.dayOfWeek)}</strong>
              <br />
              موعد الولادة المتوقع:{' '}
              <strong className="text-ink-800">{formatDate(dates.dueDate)}</strong>
            </p>
          )}

          {!valid && (visit || week || day) && (
            <p className="text-[12px] text-clay-700 mb-3" role="status">
              {visit && !validVisit
                ? 'اختاروا تاريخ زيارة صحيحًا، اليوم أو قبله.'
                : !validWeek
                  ? 'أدخلوا عدد أسابيع صحيحًا من ٠ إلى ٤٥.'
                  : 'أدخلوا عدد أيام صحيحًا من ٠ إلى ٦.'}
            </p>
          )}
          {error && <p className="text-sm text-clay-700 bg-clay-50 rounded-xl p-3 mb-3" role="alert">{error}</p>}

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={close} disabled={saving}>
              تراجع
            </Button>
            <Button className="flex-1" type="submit" disabled={!valid || saving}>
              {saving ? 'جارٍ الحفظ…' : 'حفظ عمر الحمل'}
            </Button>
          </div>
          <p className="text-[11px] text-ink-400 mt-2.5 leading-relaxed">
            سيُحدّث الحفظ تاريخ آخر دورة وموعد الولادة المتوقع فقط.
          </p>
        </form>
      </Sheet>
    </>
  )
}
