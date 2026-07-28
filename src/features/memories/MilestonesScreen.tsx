import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Field, Sheet, cx } from '../../components/ui'
import { PlusIcon, TrashIcon } from '../../components/icons'
import {
  addMilestone,
  deleteMilestone,
  toggleMilestone,
  useAppData,
} from '../../data/dataService'
import { formatDate } from '../../lib/format'

const EMOJI_CHOICES = ['😊', '😄', '🦷', '🪑', '🐣', '🗣️', '🧍', '👣', '🎈', '🏊', '🚲', '📚']

export default function MilestonesScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const achieved = data.milestones.filter((m) => m.achievedAt).length

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
        <p className="text-sm text-sage-600 leading-relaxed">
          سجّلوا لحظات طفلكم الأولى — كل معلم لحظة لا تُنسى. اضغطوا على المعلم عند حدوثه. ⭐
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {data.milestones.map((m) => {
          const done = !!m.achievedAt
          return (
            <button
              key={m.id}
              onClick={() => toggleMilestone(m.id)}
              className={cx(
                'card !p-4 text-center relative transition active:scale-[0.98]',
                done ? 'bg-gradient-to-b from-blush-100 to-peach-100' : 'opacity-80',
              )}
            >
              {!m.builtIn && (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteMilestone(m.id)
                  }}
                  className="absolute top-2 left-2 text-sage-300 hover:text-peach-500"
                >
                  <TrashIcon className="w-4 h-4" />
                </span>
              )}
              <div className={cx('text-4xl mb-2', !done && 'grayscale opacity-60')}>{m.emoji}</div>
              <div className="font-medium text-sage-800 text-sm">{m.title}</div>
              {done ? (
                <div className="text-[11px] text-peach-500 mt-1">✓ {formatDate(m.achievedAt!)}</div>
              ) : (
                <div className="text-[11px] text-sage-300 mt-1">لم يتحقق بعد</div>
              )}
            </button>
          )
        })}
      </div>

      <AddMilestoneSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function AddMilestoneSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0])

  function submit() {
    if (!title.trim()) return
    addMilestone(title.trim(), emoji)
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
