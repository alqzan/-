import { useEffect, useMemo, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { BookIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/icons'
import { addJournal, deleteJournal, updateJournal, useAppData } from '../../data/dataService'
import { localDateInputValue } from '../../lib/localDate'
import type { JournalEntry, Parent } from '../../data/types'
import { formatDate, parentLabel } from '../../lib/format'
import { validateDate } from '../../lib/validation'

export default function JournalScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<JournalEntry | null>(null)
  const [query, setQuery] = useState('')
  const { confirm, dialog } = useConfirm()

  const sorted = useMemo(() => {
    const q = query.trim()
    const list = q
      ? data.journal.filter(
          (j) => j.text.includes(q) || (j.title ?? '').includes(q),
        )
      : data.journal
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [data.journal, query])

  return (
    <>
      <ScreenHeader
        title="اليوميّات والرسائل"
        subtitle={`${data.journal.length} رسالة محفوظة`}
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

      {data.journal.length > 3 && (
        <div className="relative mb-4">
          <span className="absolute inset-y-0 start-3 grid place-items-center text-sage-300">
            <SearchIcon className="w-5 h-5" />
          </span>
          <input
            className="input ps-11"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الرسائل…"
          />
        </div>
      )}

      {data.journal.length === 0 ? (
        <EmptyState
          icon={<BookIcon className="w-8 h-8" />}
          title="اكتبوا أول رسالة"
          hint="دوّنوا مشاعركم ورسائلكم لطفلكم ليقرأها يومًا ما."
          action={<Button variant="peach" onClick={() => setOpen(true)}>اكتب رسالة</Button>}
        />
      ) : sorted.length === 0 ? (
        <EmptyState icon={<SearchIcon className="w-8 h-8" />} title="لا نتائج" hint="جرّبوا كلمة أخرى." />
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
                  onClick={() => setEditing(j)}
                  className="text-sage-300 hover:text-sage-600 p-1"
                  aria-label="تعديل"
                >
                  <EditIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    confirm({
                      title: 'حذف هذه الرسالة؟',
                      message: 'الرسالة تُحذف نهائيًا ولا يمكن استرجاعها.',
                      confirmLabel: 'حذف الرسالة',
                      onConfirm: () => deleteJournal(j.id),
                    })
                  }
                  className="text-sage-300 hover:text-red-600 p-1"
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

      <JournalSheet open={open} onClose={() => setOpen(false)} />
      <JournalSheet
        open={!!editing}
        entry={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
      {dialog}
    </>
  )
}

function JournalSheet({
  open,
  entry,
  onClose,
}: {
  open: boolean
  entry?: JournalEntry
  onClose: () => void
}) {
  const today = localDateInputValue()
  const [title, setTitle] = useState(entry?.title ?? '')
  const [text, setText] = useState(entry?.text ?? '')
  const [author, setAuthor] = useState<Parent>(entry?.author ?? 'mom')
  const [date, setDate] = useState(entry?.date ?? today)
  const [error, setError] = useState('')

  // إعادة التعبئة من البيانات المحفوظة في كل مرة تُفتح فيها النافذة —
  // حتى لا تظهر مسودة عُدّلت ثم أُلغيت عند إعادة فتح الرسالة نفسها
  useEffect(() => {
    if (!open) return
    setTitle(entry?.title ?? '')
    setText(entry?.text ?? '')
    setAuthor(entry?.author ?? 'mom')
    setDate(entry?.date ?? today)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry])

  function submit() {
    if (!text.trim()) {
      setError('اكتبوا نص الرسالة.')
      return
    }
    const dateErr = validateDate(date, { label: 'تاريخ الرسالة' })
    if (dateErr) {
      setError(dateErr)
      return
    }
    setError('')
    const payload = {
      title: title.trim() || undefined,
      text: text.trim(),
      author,
      date,
    }
    if (entry) {
      updateJournal(entry.id, payload)
    } else {
      addJournal(payload)
      setTitle('')
      setText('')
    }
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'تعديل الرسالة' : 'رسالة جديدة'}>
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
      <Button variant="peach" className="w-full mt-2" onClick={submit}>
        {entry ? 'حفظ التعديل' : 'حفظ الرسالة'}
      </Button>
    </Sheet>
  )
}
