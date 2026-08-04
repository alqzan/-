import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Field, ProgressBar, Sheet, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { CheckIcon, PlusIcon, StarIcon, TrashIcon } from '../../components/icons'
import {
  addMilestone,
  deleteMilestone,
  updateMilestone,
  useAppData,
} from '../../data/dataService'
import { formatDate } from '../../lib/format'
import { localDateInputValue, localDateToIso } from '../../lib/localDate'
import type { Milestone } from '../../data/types'

// =============================================================
// المعالم — قائمة «أوّل مرة» جاهزة، وكل واحدة تُسجَّل بتاريخها وذكرى مكتوبة.
// المسجَّل يدخل الحكاية تلقائيًا في مكانه الزمني.
// =============================================================

export default function MilestonesScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Milestone | null>(null)
  const achieved = data.milestones.filter((m) => m.achievedAt).length

  // النسخة الحيّة من المعلم المفتوح حتى تنعكس التعديلات فورًا
  const current = selected
    ? (data.milestones.find((m) => m.id === selected.id) ?? null)
    : null

  const sorted = [...data.milestones].sort((a, b) => {
    if (!!a.achievedAt === !!b.achievedAt) return 0
    return a.achievedAt ? -1 : 1
  })

  return (
    <>
      <ScreenHeader
        title="المعالم"
        subtitle={`${achieved} من ${data.milestones.length} تحقّقت`}
        action={
          <button
            onClick={() => setOpen(true)}
            className="btn-icon !bg-ink-900 !text-paper-50 !border-ink-900 shrink-0 mt-0.5"
            aria-label="معلم جديد"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <Card className="mb-5">
        <p className="text-[13px] text-ink-500 leading-relaxed mb-3">
          اضغطوا على أي معلم لتسجيل تاريخه وكتابة ذكرى عنه — ويظهر بعدها في الحكاية.
        </p>
        <ProgressBar value={data.milestones.length ? achieved / data.milestones.length : 0} />
      </Card>

      <div className="space-y-2">
        {sorted.map((m) => {
          const done = !!m.achievedAt
          return (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="card card-press !p-3.5 w-full text-right flex items-center gap-3"
            >
              <span
                className={cx(
                  'w-10 h-10 rounded-full grid place-items-center shrink-0 border',
                  done
                    ? 'bg-clay-500 text-white border-clay-500'
                    : 'bg-paper-100 text-ink-300 border-line',
                )}
              >
                {done ? <CheckIcon className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-ink-900">{m.title}</span>
                <span
                  className={cx(
                    'block text-[12px] mt-0.5 truncate',
                    done ? 'text-clay-600' : 'text-ink-300',
                  )}
                >
                  {done ? formatDate(m.achievedAt!) : 'ما تحقّق بعد'}
                </span>
                {m.note && (
                  <span className="block font-serif text-[13px] text-ink-500 mt-1 truncate">
                    {m.note}
                  </span>
                )}
              </span>
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
                className="input font-serif leading-[1.9] min-h-[6rem]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="كيف كانت اللحظة؟ من كان معكم؟"
              />
            </Field>

            <Button
              className="w-full mb-2.5"
              onClick={() => {
                void updateMilestone(milestone.id, {
                  achievedAt: date ? localDateToIso(date) : null,
                  note: note.trim() || undefined,
                })
                onClose()
              }}
            >
              {done ? 'حفظ التعديل' : 'سجّلوا المعلَم'}
            </Button>

            {done && (
              <Button
                variant="ghost"
                className="w-full mb-2.5"
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
                className="w-full !text-clay-600"
                onClick={() =>
                  confirm({
                    title: 'حذف هذا المعلم؟',
                    message: 'بيُحذف المعلم والذكرى المكتوبة عنه نهائيًا.',
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

  function submit() {
    if (!title.trim()) return
    void addMilestone(title.trim())
    setTitle('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="معلم جديد">
      <Field label="العنوان">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: أول حمّام"
          autoFocus
        />
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!title.trim()}>
        إضافة المعلم
      </Button>
    </Sheet>
  )
}
