import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, cx } from '../../components/ui'
import { BookIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { addJournal, deleteJournal, useAppData } from '../../data/dataService'
import type { Parent } from '../../data/types'
import { formatDate, parentLabel } from '../../lib/format'

export default function JournalScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)

  const sorted = [...data.journal].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <>
      <ScreenHeader
        title="اليوميّات والرسائل"
        subtitle="كلماتكم لصغيركم"
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-peach-400 text-white shadow-soft"
            aria-label="رسالة جديدة"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<BookIcon className="w-8 h-8" />}
          title="اكتبوا أول رسالة"
          hint="دوّنوا مشاعركم ورسائلكم لطفلكم ليقرأها يومًا ما."
          action={<Button variant="peach" onClick={() => setOpen(true)}>اكتب رسالة</Button>}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((j) => (
            <Card key={j.id} className="relative">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={cx(
                    'w-8 h-8 rounded-full grid place-items-center text-sm',
                    j.author === 'mom' ? 'bg-blush-100 text-blush-300' : 'bg-sky-100 text-sky-300',
                  )}
                >
                  {j.author === 'mom' ? '👩' : '👨'}
                </span>
                <div className="flex-1">
                  {j.title && <div className="font-bold text-sage-800 leading-tight">{j.title}</div>}
                  <div className="text-xs text-sage-400">
                    {parentLabel(j.author)} • {formatDate(j.date)}
                  </div>
                </div>
                <button
                  onClick={() => deleteJournal(j.id)}
                  className="text-sage-300 hover:text-peach-500 p-1"
                  aria-label="حذف"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sage-700 leading-relaxed whitespace-pre-wrap">{j.text}</p>
            </Card>
          ))}
        </div>
      )}

      <AddJournalSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function AddJournalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [author, setAuthor] = useState<Parent>('mom')
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)

  function submit() {
    if (!text.trim()) return
    addJournal({ title: title.trim() || undefined, text: text.trim(), author, date })
    setTitle('')
    setText('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="رسالة جديدة">
      <Field label="العنوان (اختياري)">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الرسالة" />
      </Field>
      <Field label="الرسالة">
        <textarea
          className="input min-h-[140px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب ما في قلبك لطفلك…"
        />
      </Field>
      <div className="flex gap-3">
        <Field label="التاريخ">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
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
      <Button variant="peach" className="w-full mt-2" onClick={submit} disabled={!text.trim()}>
        حفظ الرسالة
      </Button>
    </Sheet>
  )
}
