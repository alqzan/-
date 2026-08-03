import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { CapsuleIcon, EditIcon, LetterIcon, LockIcon, PlusIcon, TrashIcon } from '../../components/icons'
import {
  addCapsule,
  deleteCapsule,
  openCapsule,
  updateCapsule,
  useAppData,
} from '../../data/dataService'
import type { Parent, TimeCapsule } from '../../data/types'
import { formatDate, parentLabel, pluralAr } from '../../lib/format'
import { useNow } from '../../lib/useNow'

export default function CapsulesScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TimeCapsule | null>(null)
  const { confirm, dialog } = useConfirm()

  // الكبسولة تُفتح في لحظة معيّنة — نتفقّد الوقت كل دقيقة
  const now = useNow(60000)

  const sorted = [...data.capsules].sort(
    (a, b) => new Date(a.openAt).getTime() - new Date(b.openAt).getTime(),
  )
  const locked = sorted.filter((c) => new Date(c.openAt).getTime() > now).length

  return (
    <>
      <ScreenHeader
        title="الكبسولة الزمنية"
        subtitle={locked ? `${locked} رسالة تنتظر موعدها` : 'رسائل تُفتح في المستقبل'}
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="btn-icon !bg-ink-900 !text-paper-50 !border-ink-900 shrink-0 mt-0.5"
            aria-label="كبسولة جديدة"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <Card className="!bg-brass-50 !border-brass-100 mb-5">
        <p className="text-[13px] text-ink-600 leading-relaxed">
          اكتبوا رسالة لطفلكم تُقفل حتى تاريخ تختارونه — عيد ميلاده الأول، أول يوم دراسة،
          أو يوم زواجه. لا تُقرأ قبل موعدها، ولا حتى منكم.
        </p>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<CapsuleIcon className="w-8 h-8" />}
          title="لا كبسولات بعد"
          hint="أنشئوا أول رسالة زمنية."
          action={<Button onClick={() => setOpen(true)}>أنشئ كبسولة</Button>}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => (
            <CapsuleCard
              key={c.id}
              c={c}
              onEdit={() => setEditing(c)}
              onDelete={() =>
                confirm({
                  title: 'حذف هذه الكبسولة؟',
                  message: 'الرسالة تُحذف نهائيًا حتى لو لم يحن موعد فتحها بعد.',
                  confirmLabel: 'حذف الكبسولة',
                  onConfirm: () => deleteCapsule(c.id),
                })
              }
            />
          ))}
        </div>
      )}

      <CapsuleSheet open={open} onClose={() => setOpen(false)} />
      <CapsuleSheet
        open={!!editing}
        capsule={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
      {dialog}
    </>
  )
}

/** الأيام المتبقية حتى موعد الفتح */
function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function CapsuleCard({
  c,
  onEdit,
  onDelete,
}: {
  c: TimeCapsule
  onEdit: () => void
  onDelete: () => void
}) {
  const now = useNow(60000)
  const canOpen = new Date(c.openAt).getTime() <= now
  const revealed = c.isOpened
  const left = daysUntil(c.openAt)

  return (
    <Card className={cx(!canOpen && '!bg-paper-100')}>
      <div className="flex items-start gap-3">
        <div
          className={cx(
            'w-11 h-11 rounded-full grid place-items-center shrink-0',
            revealed ? 'bg-clay-50 text-clay-500' : canOpen ? 'bg-clay-500 text-white' : 'bg-white text-brass-500 border border-brass-100',
          )}
        >
          {revealed ? (
            <LetterIcon className="w-5 h-5" />
          ) : canOpen ? (
            <CapsuleIcon className="w-5 h-5" />
          ) : (
            <LockIcon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-ink-900">{c.title}</div>
          <div className="text-xs text-ink-400 mt-0.5">
            {parentLabel(c.author)} • تُفتح في {formatDate(c.openAt)}
          </div>

          {revealed ? (
            <p className="prose-note mt-2 whitespace-pre-wrap">{c.message}</p>
          ) : canOpen ? (
            <Button variant="clay" className="mt-3" onClick={() => openCapsule(c.id)}>
              حان وقتها — افتحوها
            </Button>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] text-brass-600 mt-2">
              <LockIcon className="w-4 h-4" />
              مقفلة — باقٍ {pluralAr(left, 'يوم', 'يومان', 'أيام', 'يومًا')}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          {!canOpen && (
            <button onClick={onEdit} className="text-ink-300 hover:text-ink-600 p-1" aria-label="تعديل">
              <EditIcon className="w-5 h-5" />
            </button>
          )}
          <button onClick={onDelete} className="text-ink-300 hover:text-clay-600 p-1" aria-label="حذف">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Card>
  )
}

function CapsuleSheet({
  open,
  capsule,
  onClose,
}: {
  open: boolean
  capsule?: TimeCapsule
  onClose: () => void
}) {
  const [title, setTitle] = useState(capsule?.title ?? '')
  const [message, setMessage] = useState(capsule?.message ?? '')
  const [author, setAuthor] = useState<Parent>(capsule?.author ?? 'mom')
  const [openAt, setOpenAt] = useState(capsule?.openAt ?? '')

  // إعادة التعبئة عند اختيار كبسولة مختلفة للتعديل
  const [loadedId, setLoadedId] = useState(capsule?.id)
  if (capsule && capsule.id !== loadedId) {
    setLoadedId(capsule.id)
    setTitle(capsule.title)
    setMessage(capsule.message)
    setAuthor(capsule.author)
    setOpenAt(capsule.openAt.slice(0, 10))
  }

  const valid = title.trim() && message.trim() && openAt

  function submit() {
    if (!valid) return
    if (capsule) {
      void updateCapsule(capsule.id, { title: title.trim(), message: message.trim(), author, openAt })
    } else {
      void addCapsule({ title: title.trim(), message: message.trim(), author, openAt })
      setTitle('')
      setMessage('')
      setOpenAt('')
    }
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={capsule ? 'تعديل الكبسولة' : 'كبسولة زمنية جديدة'}>
      <Field label="العنوان">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تُفتح في عيد ميلادك الأول" />
      </Field>
      <Field label="الرسالة">
        <textarea className="input min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك المستقبلية…" />
      </Field>
      <div className="flex gap-3">
        <Field label="تاريخ الفتح">
          <input type="date" className="input" value={openAt} onChange={(e) => setOpenAt(e.target.value)} />
        </Field>
        <Field label="بواسطة">
          <div className="flex bg-paper-200 rounded-full p-1">
            {(['mom', 'dad'] as Parent[]).map((p) => (
              <button
                key={p}
                onClick={() => setAuthor(p)}
                className={cx('flex-1 rounded-full py-2 text-sm', author === p ? 'bg-white text-ink-800' : 'text-ink-500')}
              >
                {parentLabel(p)}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Button className="w-full mt-2" onClick={submit} disabled={!valid}>
        {capsule ? 'حفظ التعديل' : 'إقفال الكبسولة'}
      </Button>
    </Sheet>
  )
}
