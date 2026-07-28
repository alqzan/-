import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/Header'
import { EmptyState, Sheet, Button, Field, cx } from '../../components/ui'
import {
  BookIcon,
  CameraIcon,
  CapsuleIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from '../../components/icons'
import { addPhoto, deletePhoto, useAppData } from '../../data/dataService'
import { localDateInputValue } from '../../lib/localDate'
import type { Parent, Photo } from '../../data/types'
import { fileToDataUrl } from '../../lib/image'
import { formatShortDate, monthKey, parentLabel } from '../../lib/format'

export default function MemoriesHub() {
  const data = useAppData()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [selected, setSelected] = useState<Photo | null>(null)

  // تجميع الصور حسب الشهر
  const groups = new Map<string, Photo[]>()
  for (const ph of data.photos) {
    const key = monthKey(ph.date)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(ph)
  }

  async function onPick(file: File) {
    const dataUrl = await fileToDataUrl(file)
    setPending(dataUrl)
  }

  const links = [
    { to: '/memories/journal', label: 'اليوميّات والرسائل', Icon: BookIcon, count: data.journal.length, tone: 'peach' },
    { to: '/memories/capsules', label: 'الكبسولة الزمنية', Icon: CapsuleIcon, count: data.capsules.length, tone: 'sky' },
    { to: '/memories/milestones', label: 'المعالم', Icon: StarIcon, count: data.milestones.filter((m) => m.achievedAt).length, tone: 'blush' },
  ] as const

  return (
    <>
      <ScreenHeader
        title="الذكريات"
        subtitle="نحفظ كل لحظة 💛"
        action={
          <button
            onClick={() => fileRef.current?.click()}
            className="w-10 h-10 grid place-items-center rounded-full bg-peach-400 text-white shadow-soft"
            aria-label="إضافة صورة"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />

      {/* اختصارات */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        {links.map(({ to, label, Icon, count, tone }) => {
          const tones: Record<string, string> = {
            peach: 'bg-peach-100 text-peach-500',
            sky: 'bg-sky-100 text-sky-300',
            blush: 'bg-blush-100 text-blush-300',
          }
          return (
            <button key={to} onClick={() => navigate(to)} className="card !p-3 text-center active:scale-[0.98] transition">
              <span className={cx('grid place-items-center w-11 h-11 rounded-full mx-auto mb-2', tones[tone])}>
                <Icon className="w-6 h-6" />
              </span>
              <div className="text-xs font-medium text-sage-700 leading-tight">{label}</div>
              <div className="text-[11px] text-sage-400 mt-0.5">{count}</div>
            </button>
          )
        })}
      </div>

      {/* الألبوم */}
      <h2 className="section-title mt-6 mb-3">الألبوم</h2>
      {data.photos.length === 0 ? (
        <EmptyState
          icon={<CameraIcon className="w-8 h-8" />}
          title="ابدؤوا ألبوم الذكريات"
          hint="أضيفوا صور السونار، بطن الحمل، وكل لحظة جميلة."
          action={<Button variant="peach" onClick={() => fileRef.current?.click()}>أضف صورة</Button>}
        />
      ) : (
        [...groups.entries()].map(([month, photos]) => (
          <div key={month} className="mb-5">
            <div className="text-sm text-sage-400 mb-2">{month}</div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((ph) => (
                <button
                  key={ph.id}
                  onClick={() => setSelected(ph)}
                  className="aspect-square rounded-2xl overflow-hidden bg-cream-200"
                >
                  <img src={ph.dataUrl} alt={ph.caption ?? 'ذكرى'} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {/* نافذة إضافة صورة */}
      <AddPhotoSheet dataUrl={pending} onClose={() => setPending(null)} />

      {/* عرض صورة */}
      <Sheet open={!!selected} onClose={() => setSelected(null)} title="ذكرى">
        {selected && (
          <div>
            <img src={selected.dataUrl} alt={selected.caption ?? ''} className="w-full rounded-2xl mb-3" />
            {selected.caption && <p className="text-sage-700 mb-1">{selected.caption}</p>}
            <p className="text-sm text-sage-400">
              {formatShortDate(selected.date)} • {parentLabel(selected.author)}
            </p>
            <Button
              variant="ghost"
              className="w-full mt-4 !text-peach-500"
              onClick={() => {
                deletePhoto(selected.id)
                setSelected(null)
              }}
            >
              <TrashIcon className="w-5 h-5" /> حذف الصورة
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}

function AddPhotoSheet({ dataUrl, onClose }: { dataUrl: string | null; onClose: () => void }) {
  const [caption, setCaption] = useState('')
  const [author, setAuthor] = useState<Parent>('mom')
  const today = localDateInputValue()
  const [date, setDate] = useState(today)

  function submit() {
    if (!dataUrl) return
    addPhoto({ dataUrl, caption: caption.trim() || undefined, author, date })
    setCaption('')
    onClose()
  }

  return (
    <Sheet open={!!dataUrl} onClose={onClose} title="إضافة ذكرى">
      {dataUrl && <img src={dataUrl} alt="معاينة" className="w-full rounded-2xl mb-4 max-h-64 object-cover" />}
      <Field label="تعليق (اختياري)">
        <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="اكتب وصفًا للحظة" />
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
      <Button variant="peach" className="w-full mt-2" onClick={submit}>
        حفظ الذكرى
      </Button>
    </Sheet>
  )
}
