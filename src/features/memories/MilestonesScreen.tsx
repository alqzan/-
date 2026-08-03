import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Field, ProgressBar, Sheet, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { PlusIcon, TrashIcon } from '../../components/icons'
import {
  addMilestone,
  deleteMilestone,
  updateMilestone,
  useAppData,
} from '../../data/dataService'
import { formatDate } from '../../lib/format'
import { localDateInputValue, localDateToIso } from '../../lib/localDate'
import type { Milestone } from '../../data/types'

const EMOJI_CHOICES = ['😊', '😄', '🦷', '🪑', '🐣', '🗣️', '🧍', '👣', '🎈', '🏊', '🚲', '📚']

export default function MilestonesScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Milestone | null>(null)
  const achieved = data.milestones.filter((m) => m.achievedAt).length

  // النسخة الحيّة من المعلم المفتوح حتى تنعكس التعديلات فورًا
  const current = selected
    ? (data.milestones.find((m) => m.id === selected.id) ?? null)
    : null

  return (
    <>
      <ScreenHeader
        title="المعالم"
        subtitle={`${achieved} من ${data.milestones.length} تحقّقت`}
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-blush-300 text-white shadow-soft"
            aria-label="معلم جديد"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <Card className="bg-blush-100 mb-4">
        <p className="text-sm text-sage-600 leading-relaxed mb-3">
          سجّلوا لحظات طفلكم الأولى — اضغطوا على المعلم لتحديد تاريخه وكتابة ذكرى عنه. ⭐
        </p>
        <ProgressBar value={data.milestones.length ? achieved / data.milestones.length : 0} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {data.milestones.map((m) => {
          const done = !!m.achievedAt
          return (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={cx(
                'card !p-4 text-center relative transition active:scale-[0.98]',
                done ? 'bg-gradient-to-b from-blush-100 to-peach-100' : 'opacity-80',
              )}
            >
              <div className={cx('text-4xl mb-2', !done && 'grayscale opacity-60')}>{m.emoji}</div>
              <div className="font-medium text-sage-800 text-sm">{m.title}</div>
              {done ? (
                <div className="text-[11px] text-peach-500 mt-1">✓ {formatDate(m.achievedAt!)}</div>
              ) : (
                <div className="text-[11px] text-sage-300 mt-1">لم يتحقق بعد</div>
              )}
              {m.note && <div className="text-[11px] text-sage-400 mt-1 truncate">“{m.note}”</div>}
            </button>
          )
        })}
      </div>

      <MilestoneSheet milestone={current} onClose={() => setSelected(null)} />
      <AddMilestoneSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function MilestoneSheet({
  milestone,
  onClose,
}: {
  milestone: Milestone | null
  onClose: () => void
}) {
  const { confirm, dialog } = useConfirm()
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [loadedId, setLoadedId] = useState<string | undefined>()

  // إعادة التعبئة عند فتح معلم مختلف
  if (milestone && milestone.id !== loadedId) {
    setLoadedId(milestone.id)
    setDate(milestone.achievedAt ? milestone.achievedAt.slice(0, 10) : localDateInputValue())
    setNote(milestone.note ?? '')
  }

  const done = !!milestone?.achievedAt

  return (
    <>
      <Sheet open={!!milestone} onClose={onClose} title={milestone?.title ?? ''}>
        {milestone && (
          <>
            <div className="text-center text-5xl mb-4">{milestone.emoji}</div>

            <Field label="تاريخ تحققه">
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="ذكرى عن اللحظة (اختياري)">
              <textarea
                className="input min-h-[90px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="كيف كانت اللحظة؟ من كان معكم؟"
              />
            </Field>

            <Button
              className="w-full mb-2"
              onClick={() => {
                void updateMilestone(milestone.id, {
                  achievedAt: date ? localDateToIso(date) : null,
                  note: note.trim() || undefined,
                })
                onClose()
              }}
            >
              {done ? 'حفظ التعديل' : '⭐ سجّل المعلم'}
            </Button>

            {done && (
              <Button
                variant="ghost"
                className="w-full mb-2"
                onClick={() => {
                  void updateMilestone(milestone.id, { achievedAt: null })
                  onClose()
                }}
              >
                إلغاء تحقّق المعلم
              </Button>
            )}

            {!milestone.builtIn && (
              <Button
                variant="ghost"
                className="w-full !text-red-700"
                onClick={() =>
                  confirm({
                    title: 'حذف هذا المعلم؟',
                    message: 'سيُحذف المعلم والذكرى المكتوبة عنه نهائيًا.',
                    confirmLabel: 'حذف المعلم',
                    onConfirm: () => {
                      void deleteMilestone(milestone.id)
                      onClose()
                    },
                  })
                }
              >
                <TrashIcon className="w-5 h-5" /> حذف المعلم
              </Button>
            )}
          </>
        )}
      </Sheet>
      {dialog}
    </>
  )
}

function AddMilestoneSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0])

  function submit() {
    if (!title.trim()) return
    void addMilestone(title.trim(), emoji)
    setTitle('')
    setEmoji(EMOJI_CHOICES[0])
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="معلم جديد">
      <Field label="العنوان">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: أول حمّام" />
      </Field>
      <Field label="الأيقونة">
        <div className="flex flex-wrap gap-2">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={cx(
                'w-11 h-11 rounded-2xl text-2xl grid place-items-center border',
                emoji === e ? 'bg-sage-100 border-sage-300' : 'bg-white border-cream-300',
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!title.trim()}>
        إضافة المعلم
      </Button>
    </Sheet>
  )
}
