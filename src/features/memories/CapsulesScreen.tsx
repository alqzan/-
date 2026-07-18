import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, cx } from '../../components/ui'
import { CapsuleIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { addCapsule, deleteCapsule, openCapsule, useAppData } from '../../data/dataService'
import type { Parent, TimeCapsule } from '../../data/types'
import { formatDate, parentLabel } from '../../lib/format'

export default function CapsulesScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)

  const sorted = [...data.capsules].sort(
    (a, b) => new Date(a.openAt).getTime() - new Date(b.openAt).getTime(),
  )

  return (
    <>
      <ScreenHeader
        title="الكبسولة الزمنية"
        subtitle="رسائل تُفتح في المستقبل"
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
            <CapsuleCard key={c.id} c={c} />
          ))}
        </div>
      )}

      <AddCapsuleSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function CapsuleCard({ c }: { c: TimeCapsule }) {
  const canOpen = new Date(c.openAt).getTime() <= Date.now()
  const revealed = c.isOpened

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
            <p className="text-sm text-sage-400 mt-2">الرسالة مقفلة حتى موعدها…</p>
          )}
        </div>
        <button
          onClick={() => deleteCapsule(c.id)}
          className="text-sage-300 hover:text-peach-500 p-1"
          aria-label="حذف"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </Card>
  )
}

function AddCapsuleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [author, setAuthor] = useState<Parent>('mom')
  const [openAt, setOpenAt] = useState('')

  function submit() {
    if (!title.trim() || !message.trim() || !openAt) return
    addCapsule({ title: title.trim(), message: message.trim(), author, openAt })
    setTitle('')
    setMessage('')
    setOpenAt('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="كبسولة زمنية جديدة">
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
                className={cx('flex-1 rounded-full py-2 text-sm', author === p ? 'bg-white text-sage-700' : 'text-sage-500')}
              >
                {parentLabel(p)}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Button className="w-full mt-2" onClick={submit} disabled={!title.trim() || !message.trim() || !openAt}>
        إقفال الكبسولة
      </Button>
    </Sheet>
  )
}
