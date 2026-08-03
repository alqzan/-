import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/Header'
import { EmptyState, Sheet, Button, Field, Segmented, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import {
  BookIcon,
  BookOpenIcon,
  CameraIcon,
  CapsuleIcon,
  HeartFillIcon,
  HeartIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from '../../components/icons'
import {
  addPhoto,
  deletePhoto,
  togglePhotoFavorite,
  updatePhoto,
  useAppData,
} from '../../data/dataService'
import { localDateInputValue } from '../../lib/localDate'
import type { Parent, Photo } from '../../data/types'
import { fileToDataUrl, photoSrc } from '../../lib/image'
import { formatShortDate, monthKey, parentLabel } from '../../lib/format'

type Filter = 'all' | 'favorites'

export default function MemoriesHub() {
  const data = useAppData()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [selected, setSelected] = useState<Photo | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const { confirm, dialog } = useConfirm()

  const favorites = data.photos.filter((p) => p.favorite).length
  const visible = filter === 'favorites' ? data.photos.filter((p) => p.favorite) : data.photos

  // تجميع الصور حسب الشهر (الأحدث أولًا)
  const groups = useMemo(() => {
    const byMonth = new Map<string, Photo[]>()
    const sorted = [...visible].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    for (const ph of sorted) {
      const key = monthKey(ph.date)
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(ph)
    }
    return [...byMonth.entries()]
  }, [visible])

  async function onPick(file: File) {
    const dataUrl = await fileToDataUrl(file)
    setPending(dataUrl)
  }

  // الصورة المعروضة تُقرأ من الحالة الحيّة حتى تنعكس التعديلات فورًا
  const openPhoto = selected ? (data.photos.find((p) => p.id === selected.id) ?? null) : null

  const links = [
    { to: '/memories/journal', label: 'اليوميّات والرسائل', Icon: BookIcon, count: data.journal.length, tone: 'peach' },
    { to: '/memories/capsules', label: 'الكبسولة الزمنية', Icon: CapsuleIcon, count: data.capsules.length, tone: 'sky' },
    { to: '/memories/milestones', label: 'المعالم', Icon: StarIcon, count: data.milestones.filter((m) => m.achievedAt).length, tone: 'blush' },
  ] as const

  return (
    <>
      <ScreenHeader
        title="الذكريات"
        subtitle={`${data.photos.length} صورة • ${data.journal.length} رسالة`}
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
          if (f) void onPick(f)
          e.target.value = ''
        }}
      />

      {/* اختصارات */}
      <div className="grid grid-cols-3 gap-3 mb-3">
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

      {/* كتاب الذكريات */}
      <button
        onClick={() => navigate('/memories/book')}
        className="card w-full text-start active:scale-[0.99] transition mb-2 bg-gradient-to-bl from-cream-200 to-peach-100 flex items-center gap-3"
      >
        <span className="w-11 h-11 rounded-2xl bg-white/70 grid place-items-center text-peach-500 shrink-0">
          <BookOpenIcon className="w-6 h-6" />
        </span>
        <div className="flex-1">
          <div className="font-bold text-sage-800">كتاب الذكريات</div>
          <div className="text-xs text-sage-500">اعرضوا الرحلة كاملة في صفحة واحدة — وجاهزة للطباعة أو PDF</div>
        </div>
      </button>

      {/* الألبوم */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <h2 className="section-title mb-0">الألبوم</h2>
        {favorites > 0 && (
          <div className="w-40">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'favorites', label: `مفضلة ${favorites}` },
              ]}
            />
          </div>
        )}
      </div>

      {data.photos.length === 0 ? (
        <EmptyState
          icon={<CameraIcon className="w-8 h-8" />}
          title="ابدؤوا ألبوم الذكريات"
          hint="أضيفوا صور السونار، بطن الحمل، وكل لحظة جميلة."
          action={<Button variant="peach" onClick={() => fileRef.current?.click()}>أضف صورة</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<HeartIcon className="w-8 h-8" />}
          title="لا صور مفضّلة بعد"
          hint="اضغطوا القلب على أي صورة لتظهر هنا."
        />
      ) : (
        groups.map(([month, photos]) => (
          <div key={month} className="mb-5">
            <div className="text-sm text-sage-400 mb-2">{month}</div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((ph) => (
                <button
                  key={ph.id}
                  onClick={() => setSelected(ph)}
                  className="aspect-square rounded-2xl overflow-hidden bg-cream-200 relative"
                >
                  <img src={photoSrc(ph)} alt={ph.caption ?? 'ذكرى'} className="w-full h-full object-cover" />
                  {ph.favorite && (
                    <span className="absolute bottom-1.5 start-1.5 text-white drop-shadow">
                      <HeartFillIcon className="w-4 h-4" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {/* نافذة إضافة صورة */}
      <AddPhotoSheet dataUrl={pending} onClose={() => setPending(null)} />

      {/* عرض صورة */}
      <Sheet open={!!openPhoto} onClose={() => setSelected(null)} title="ذكرى">
        {openPhoto && (
          <PhotoDetails
            photo={openPhoto}
            onDelete={() =>
              confirm({
                title: 'حذف هذه الصورة؟',
                message: 'الصورة تُحذف نهائيًا من هذا الجهاز ولا يمكن استرجاعها.',
                confirmLabel: 'حذف الصورة',
                onConfirm: () => {
                  void deletePhoto(openPhoto.id)
                  setSelected(null)
                },
              })
            }
          />
        )}
      </Sheet>

      {dialog}
    </>
  )
}

function PhotoDetails({ photo, onDelete }: { photo: Photo; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [caption, setCaption] = useState(photo.caption ?? '')

  return (
    <div>
      <img src={photoSrc(photo)} alt={photo.caption ?? ''} className="w-full rounded-2xl mb-3" />

      {editing ? (
        <>
          <Field label="التعليق">
            <input
              className="input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="اكتب وصفًا للحظة"
            />
          </Field>
          <div className="flex gap-3 mb-2">
            <Button
              className="flex-1"
              onClick={() => {
                void updatePhoto(photo.id, { caption: caption.trim() || undefined })
                setEditing(false)
              }}
            >
              حفظ التعليق
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => setEditing(false)}>
              إلغاء
            </Button>
          </div>
        </>
      ) : (
        <>
          {photo.caption && <p className="text-sage-700 mb-1">{photo.caption}</p>}
          <p className="text-sm text-sage-400">
            {formatShortDate(photo.date)} • {parentLabel(photo.author)}
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => togglePhotoFavorite(photo.id)}
              className={cx(
                'btn flex-1 py-2.5 border',
                photo.favorite
                  ? 'bg-blush-100 text-blush-300 border-blush-100'
                  : 'bg-white text-sage-600 border-cream-300',
              )}
            >
              {photo.favorite ? <HeartFillIcon className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
              {photo.favorite ? 'في المفضلة' : 'أضف للمفضلة'}
            </button>
            <Button variant="ghost" className="flex-1 py-2.5" onClick={() => setEditing(true)}>
              تعديل التعليق
            </Button>
          </div>
          <Button variant="ghost" className="w-full mt-2 !text-red-700" onClick={onDelete}>
            <TrashIcon className="w-5 h-5" /> حذف الصورة
          </Button>
        </>
      )}
    </div>
  )
}

function AddPhotoSheet({ dataUrl, onClose }: { dataUrl: string | null; onClose: () => void }) {
  const [caption, setCaption] = useState('')
  const [author, setAuthor] = useState<Parent>('mom')
  const today = localDateInputValue()
  const [date, setDate] = useState(today)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!dataUrl || saving) return
    setSaving(true)
    // الحفظ الآن غير متزامن — ننتظر النتيجة الحقيقية قبل إغلاق النافذة،
    // وإلا أغلقناها والصورة لم تصل التخزين أصلًا.
    const ok = await addPhoto({ dataUrl, caption: caption.trim() || undefined, author, date })
    setSaving(false)
    if (!ok) {
      setError(
        'لم تُحفظ الصورة — مساحة التخزين على هذا الجهاز ممتلئة. احذفوا صورًا قديمة أو نزّلوا نسخة احتياطية من الإعدادات.',
      )
      return
    }
    setCaption('')
    setError('')
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
      {error && (
        <p role="alert" className="text-sm text-red-800 bg-red-50 rounded-2xl p-3 mb-3 leading-relaxed">
          {error}
        </p>
      )}
      <Button variant="peach" className="w-full mt-2" onClick={() => void submit()} disabled={saving}>
        {saving ? 'جارٍ الحفظ…' : 'حفظ الذكرى'}
      </Button>
    </Sheet>
  )
}
