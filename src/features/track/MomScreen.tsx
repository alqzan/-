import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { HeartIcon, MomIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { addMomLog, deleteMomLog, useAppData } from '../../data/dataService'
import { localDateInputValue } from '../../lib/localDate'
import type { Mood } from '../../data/types'
import { formatDate } from '../../lib/format'

const MOODS: Array<{ value: Mood; label: string }> = [
  { value: 'great', label: 'ممتاز' },
  { value: 'good', label: 'جيد' },
  { value: 'ok', label: 'عادي' },
  { value: 'tired', label: 'متعبة' },
  { value: 'unwell', label: 'تعبانة' },
]
const moodOf = (m?: Mood) => MOODS.find((x) => x.value === m)

const COMMON_SYMPTOMS = ['غثيان', 'تعب', 'صداع', 'ألم ظهر', 'حرقة معدة', 'أرق', 'تورّم', 'دوخة']

export default function MomScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const { confirm, dialog } = useConfirm()

  return (
    <>
      <ScreenHeader
        title="متابعة الأم"
        subtitle="صحتكِ جزء من الحكاية"
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-ink-400 text-white shadow-lift"
            aria-label="تدوينة جديدة"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      {data.momLogs.length === 0 ? (
        <EmptyState
          icon={<HeartIcon className="w-8 h-8" />}
          title="لا تدوينات بعد"
          hint="سجّلي وزنك ومزاجك وأعراضك لمتابعة صحتك خلال الحمل."
          action={<Button onClick={() => setOpen(true)}>أضيفي تدوينة</Button>}
        />
      ) : (
        <div className="space-y-2">
          {data.momLogs.map((log) => {
            const mood = moodOf(log.mood)
            return (
              <Card key={log.id} className="!p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-paper-200 text-ink-500 grid place-items-center shrink-0">
                    <MomIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-ink-900">{formatDate(log.date)}</span>
                      {log.weightKg != null && (
                        <span className="chip !text-xs tnum">{log.weightKg} كجم</span>
                      )}
                    </div>
                    {mood && <div className="text-sm text-ink-500 mt-0.5">المزاج: {mood.label}</div>}
                    {log.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {log.symptoms.map((s) => (
                          <span key={s} className="chip !bg-clay-50 !text-clay-600 !text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {log.note && <p className="text-sm text-ink-600 mt-2">{log.note}</p>}
                  </div>
                  <button
                    onClick={() =>
                      confirm({
                        title: 'حذف هذه التدوينة؟',
                        confirmLabel: 'حذف',
                        onConfirm: () => deleteMomLog(log.id),
                      })
                    }
                    className="text-ink-300 hover:text-clay-600 p-1"
                    aria-label="حذف"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <AddMomLogSheet open={open} onClose={() => setOpen(false)} />
      {dialog}
    </>
  )
}

function AddMomLogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = localDateInputValue()
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [mood, setMood] = useState<Mood | undefined>()
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [note, setNote] = useState('')

  function toggleSymptom(s: string) {
    setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  }

  function submit() {
    void addMomLog({
      date,
      weightKg: weight ? Number(weight) : undefined,
      mood,
      symptoms,
      note: note.trim() || undefined,
    })
    setDate(today)
    setWeight('')
    setMood(undefined)
    setSymptoms([])
    setNote('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="تدوينة جديدة">
      <div className="flex gap-3">
        <Field label="التاريخ">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="الوزن (كجم)">
          <input type="number" inputMode="decimal" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="64.5" />
        </Field>
      </div>

      <Field label="المزاج">
        <div className="flex justify-between gap-1">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value === mood ? undefined : m.value)}
              className={cx(
                'flex-1 rounded-2xl py-2.5 text-[13px] border transition',
                mood === m.value
                  ? 'bg-ink-900 text-paper-50 border-ink-900'
                  : 'bg-white border-line text-ink-600',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="الأعراض">
        <div className="flex flex-wrap gap-2">
          {COMMON_SYMPTOMS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSymptom(s)}
              className={cx(
                'rounded-full px-3 py-1.5 text-sm border transition',
                symptoms.includes(s)
                  ? 'bg-clay-500 text-white border-clay-500'
                  : 'bg-white text-ink-600 border-paper-300',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Field label="ملاحظة (اختياري)">
        <textarea className="input min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="كيف كان يومك؟" />
      </Field>

      <Button className="w-full mt-2" onClick={submit}>
        حفظ التدوينة
      </Button>
    </Sheet>
  )
}
