import { useEffect, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { CapsuleIcon, EditIcon, PlusIcon, TrashIcon } from '../../components/icons'
import {
  addCapsule,
  deleteCapsule,
  openCapsule,
  updateCapsule,
  useAppData,
} from '../../data/dataService'
import type { Parent, TimeCapsule } from '../../data/types'
import { formatDate, parentLabel } from '../../lib/format'
import { validateCapsuleOpenDate } from '../../lib/validation'

export default function CapsulesScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TimeCapsule | null>(null)
  const { confirm, dialog } = useConfirm()

  const sorted = [...data.capsules].sort(
    (a, b) => new Date(a.openAt).getTime() - new Date(b.openAt).getTime(),
  )
  const locked = sorted.filter((c) => new Date(c.openAt).getTime() > Date.now()).length

  return (
    <>
      <ScreenHeader
        title="الكبسولة الزمنية"
        subtitle={locked ? `${locked} رسالة تنتظر موعدها` : 'رسائل تُفتح في المستقبل'}
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-sky-300 text-white shadow-soft"
            aria-label="كبسولة جديدة"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <Card className="bg-sky-100 mb-4">
        <p className="text-sm text-sage-600 leading-relaxed">
          اكتبوا رسالة لطفلكم تُقفل حتى تاريخ تختارونه — عيد ميلاده الأول، أول يوم دراسة،
          أو أي لحظة مميزة. مفاجأة من الماضي 🎁
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
  const canOpen = new Date(c.openAt).getTime() <= Date.now()
  const revealed = c.isOpened
  const left = daysUntil(c.openAt)

  return (
    <Card className={cx(!canOpen && 'bg-gradient-to-bl from-sage-100 to-sky-100')}>
      <div className="flex items-start gap-3">
        <div
          className={cx(
            'w-12 h-12 rounded-2xl grid place-items-center text-2xl shrink-0',
            canOpen ? 'bg-peach-100' : 'bg-white/70',
          )}
        >
          {revealed ? '💌' : canOpen ? '🎁' : '🔒'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sage-800">{c.title}</div>
          <div className="text-xs text-sage-400 mt-0.5">
            {parentLabel(c.author)} • تُفتح في {formatDate(c.openAt)}
          </div>

          {revealed ? (
            <p className="text-sage-700 leading-relaxed mt-2 whitespace-pre-wrap">{c.message}</p>
          ) : canOpen ? (
            <Button className="mt-3" onClick={() => openCapsule(c.id)}>
              🎉 افتح الكبسولة
            </Button>
          ) : (
            <p className="text-sm text-sage-500 mt-2">
              مقفلة — باقٍ {left} {left === 1 ? 'يوم' : 'يومًا'} 🔒
            </p>
          )}
        </div>
        <div className="flex flex-col">
          {!canOpen && (
            <button onClick={onEdit} className="text-sage-300 hover:text-sage-600 p-1" aria-label="تعديل">
              <EditIcon className="w-5 h-5" />
            </button>
          )}
          <button onClick={onDelete} className="text-sage-300 hover:text-red-600 p-1" aria-label="حذف">
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
  const [error, setError] = useState('')

  // إعادة التعبئة من البيانات المحفوظة في كل مرة تُفتح فيها النافذة —
  // حتى لا تظهر مسودة عُدّلت ثم أُلغيت عند إعادة فتح الكبسولة نفسها
  useEffect(() => {
    if (!open) return
    setTitle(capsule?.title ?? '')
    setMessage(capsule?.message ?? '')
    setAuthor(capsule?.author ?? 'mom')
    setOpenAt(capsule?.openAt ? capsule.openAt.slice(0, 10) : '')
    setError('')
  }, [open, capsule])

  const valid = title.trim() && message.trim() && openAt

  function submit() {
    if (!valid) {
      setError('أكملوا العنوان والرسالة وتاريخ الفتح.')
      return
    }
    // كبسولة جديدة يجب أن تُفتح في المستقبل؛ عند التعديل نسمح بإبقاء تاريخ
    // فتح قديم كما هو إن لم يُغيَّر، لكن لا نسمح بتحويله إلى الماضي
    const dateErr = validateCapsuleOpenDate(openAt)
    if (dateErr && (!capsule || openAt !== capsule.openAt.slice(0, 10))) {
      setError(dateErr)
      return
    }
    setError('')
    if (capsule) {
      updateCapsule(capsule.id, { title: title.trim(), message: message.trim(), author, openAt })
    } else {
      addCapsule({ title: title.trim(), message: message.trim(), author, openAt })
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
          <div className="flex bg-sage-100 rounded-full p-1">
            {(['mom', 'dad'] as Parent[]).map((p) => (
              <button
                key={p}
                onClick={() => setAuthor(p)}
                aria-pressed={author === p}
                className={cx('flex-1 rounded-full py-2 text-sm', author === p ? 'bg-white text-sage-700' : 'text-sage-500')}
              >
                {parentLabel(p)}
              </button>
            ))}
          </div>
        </Field>
      </div>
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-2xl p-3 mb-3">{error}</p>}
      <Button className="w-full mt-2" onClick={submit}>
        {capsule ? 'حفظ التعديل' : 'إقفال الكبسولة'}
      </Button>
    </Sheet>
  )
}
