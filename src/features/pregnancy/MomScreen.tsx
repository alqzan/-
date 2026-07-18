import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, cx } from '../../components/ui'
import { HeartIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { addMomLog, deleteMomLog, useAppData } from '../../data/dataService'
import type { Mood } from '../../data/types'
import { formatDate } from '../../lib/format'

const MOODS: Array<{ value: Mood; emoji: string; label: string }> = [
  { value: 'great', emoji: '😄', label: 'ممتاز' },
  { value: 'good', emoji: '🙂', label: 'جيد' },
  { value: 'ok', emoji: '😐', label: 'عادي' },
  { value: 'tired', emoji: '😴', label: 'متعب' },
  { value: 'unwell', emoji: '🤢', label: 'متوعك' },
]
const moodOf = (m?: Mood) => MOODS.find((x) => x.value === m)

const COMMON_SYMPTOMS = ['غثيان', 'تعب', 'صداع', 'ألم ظهر', 'حرقة معدة', 'أرق', 'تورّم', 'دوخة']

export default function MomScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)

  return (
    <>
      <ScreenHeader
        title="متابعة الأم"
        subtitle="صحتك أولًا 💛"
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-sage-400 text-white shadow-soft"
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
                  <div className="text-3xl">{mood?.emoji ?? '📝'}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sage-800">{formatDate(log.date)}</span>
                      {log.weightKg != null && (
                        <span className="chip !text-xs">⚖️ {log.weightKg} كجم</span>
                      )}
                    </div>
                    {mood && <div className="text-sm text-sage-500 mt-0.5">المزاج: {mood.label}</div>}
                    {log.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {log.symptoms.map((s) => (
                          <span key={s} className="chip !bg-peach-100 !text-peach-500 !text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {log.note && <p className="text-sm text-sage-600 mt-2">{log.note}</p>}
                  </div>
                  <button
                    onClick={() => deleteMomLog(log.id)}
                    className="text-sage-300 hover:text-peach-500 p-1"
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
    </>
  )
}

function AddMomLogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [mood, setMood] = useState<Mood | undefined>()
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [note, setNote] = useState('')

  function toggleSymptom(s: string) {
    setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  }

  function submit() {
    addMomLog({
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
                'flex-1 rounded-2xl py-2 text-2xl border transition',
                mood === m.value ? 'bg-sage-100 border-sage-300' : 'bg-white border-cream-300',
              )}
              title={m.label}
            >
              {m.emoji}
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
                  ? 'bg-peach-400 text-white border-peach-400'
                  : 'bg-white text-sage-600 border-cream-300',
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
