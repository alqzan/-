import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarIcon,
  CameraIcon,
  CapsuleIcon,
  CheckIcon,
  EditIcon,
  FeatherIcon,
  HeartFillIcon,
  HeartIcon,
  LockIcon,
  MicIcon,
  QuoteIcon,
  ShareIcon,
  SearchIcon,
  StarIcon,
  StoryIcon,
  TrashIcon,
} from '../../components/icons'
import { Button, EmptyState, Field, Sheet, cx } from '../../components/ui'
import { useCapture } from '../../components/Capture'
import VoicePlayer from '../../components/VoicePlayer'
import RecordSyncLine from '../../components/RecordSyncLine'
import { buildShareCard, shareCard } from '../../lib/shareCard'
import Confirm from '../../components/Confirm'
import {
  deleteCapsule,
  deleteJournal,
  deleteMilestone,
  deletePhoto,
  deleteVoice,
  updateVoice,
  togglePhotoFavorite,
  updateJournal,
  updateMilestone,
  updatePhoto,
  useAppData,
} from '../../data/dataService'
import LifeEvents from './LifeEvents'
import { formatDate, parentLabel, pluralAr } from '../../lib/format'
import { photoSrc } from '../../lib/image'
import { useNow } from '../../lib/useNow'
import {
  buildStory,
  sameDayItems,
  chapterize,
  filterStory,
  searchStory,
  stageLabel,
  storyStats,
  type StoryFilter,
  type StoryItem,
} from './timeline'

// =============================================================
// «الحكاية» — كل ما وثّقه الوالدان في خيط واحد مقسّم إلى فصول شهرية.
// لا ألبوم منفصل ولا يوميّات منفصلة: اللحظة هي الوحدة، والزمن هو الترتيب.
// =============================================================

const FILTERS: Array<{ value: StoryFilter; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'photo', label: 'صور' },
  { value: 'letter', label: 'ذكريات مكتوبة' },
  { value: 'voice', label: 'أصوات' },
  { value: 'milestone', label: 'محطات' },
]

export default function Story() {
  const data = useAppData()
  const navigate = useNavigate()
  const { open } = useCapture()
  const [filter, setFilter] = useState<StoryFilter>('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  // نحفظ مفتاح العنصر لا نسخته: تُشتق النسخة الحيّة كل مرة فيظهر التعديل فورًا
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = useMemo(
    () => (selectedKey ? (buildStory(data).find((i) => i.key === selectedKey) ?? null) : null),
    [data, selectedKey],
  )
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const stats = storyStats(data)

  // «الآن» يتغيّر كل دقيقة: به تُفتح الكبسولات التي حان موعدها بلا إعادة تحميل
  const now = useNow(60000)

  const chapters = useMemo(() => {
    let items = buildStory(data, new Date(now))
    if (favoritesOnly) items = items.filter((i) => i.favorite)
    items = filterStory(items, filter)
    items = searchStory(items, query)
    return chapterize(items, data.child)
  }, [data, filter, query, favoritesOnly, now])

  const empty = chapters.length === 0

  return (
    <>
      <header className="pt-6 pb-4">
        <div className="eyebrow">من بداية الحمل إلى اليوم</div>
        <div className="flex items-center justify-between gap-3 mt-1.5">
          <h1 className="title-lg">الذكريات</h1>
          <button
            type="button"
            onClick={() => open('quickMemory')}
            className="btn-outline !py-2 !px-3 shrink-0 text-[13px]"
          >
            <FeatherIcon className="w-4 h-4" /> اكتبوا ذكرى
          </button>
        </div>
        <p className="text-[13px] text-ink-400 mt-1.5">
          {pluralAr(stats.photos, 'صورة واحدة', 'صورتان', 'صور', 'صورة')}
          {' • '}
          {pluralAr(stats.letters, 'رسالة واحدة', 'رسالتان', 'رسائل', 'رسالة')}
          {' • '}
          {pluralAr(stats.voices, 'تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلًا')}
          {' • '}
          {pluralAr(stats.milestones, 'محطة واحدة', 'محطتان', 'محطات', 'محطة')}
        </p>
      </header>

      <LifeEvents stage={data.child.bornAt ? 'child' : 'pregnancy'} milestones={data.milestones} />

      {/* أدوات الذكريات تبقى خفيفة؛ مساحة الخيط للمحتوى نفسه. */}
      <nav aria-label="أدوات الذكريات" className="flex items-center gap-4 border-y border-line py-2.5">
        <DoorButton
          icon={<StoryIcon className="w-5 h-5" />}
          label="الكتاب"
          onClick={() => navigate('/story/book')}
        />
        <DoorButton
          icon={<StarIcon className="w-5 h-5" />}
          label="أحداث الطفل"
          onClick={() => navigate('/story/milestones')}
        />
        <DoorButton
          icon={<CapsuleIcon className="w-5 h-5" />}
          label="الكبسولات"
          onClick={() => navigate('/story/capsules')}
        />
      </nav>

      {/* الفلاتر والبحث */}
      {/* يلتصق تحت شريط الحالة لا خلفه (الصفحة تمتدّ خلف الشقّ) */}
      <div
        className="sticky z-20 -mx-5 px-5 pt-4 pb-3 bg-paper-50/95 backdrop-blur mt-5"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={cx(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition duration-200',
                  filter === f.value
                    ? 'bg-ink-900 text-paper-50'
                    : 'bg-paper-200 text-ink-500',
                )}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-pressed={favoritesOnly}
              aria-label="المفضّلة فقط"
              className={cx(
                'shrink-0 rounded-full px-3 py-1.5 transition duration-200',
                favoritesOnly ? 'bg-clay-500 text-white' : 'bg-paper-200 text-ink-400',
              )}
            >
              <HeartFillIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              setSearching((v) => !v)
              if (searching) setQuery('')
            }}
            aria-label="بحث"
            className={cx(
              'w-9 h-9 grid place-items-center rounded-full shrink-0 transition',
              searching ? 'bg-ink-900 text-paper-50' : 'bg-paper-200 text-ink-500',
            )}
          >
            <SearchIcon className="w-4 h-4" />
          </button>
        </div>
        {searching && (
          <input
            className="input mt-2.5 !py-2.5"
            aria-label="بحث في الحكاية"
            placeholder="ابحثوا في الرسائل والتعليقات…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        )}
      </div>

      {empty ? (
        <EmptyState
          icon={<CameraIcon className="w-6 h-6" />}
          title={query || filter !== 'all' || favoritesOnly ? 'ما فيه شي هنا' : 'الذكريات ما بدأت بعد'}
          hint={
            query || filter !== 'all' || favoritesOnly
              ? 'جرّبوا فلترًا آخر أو امسحوا البحث.'
              : 'أول صورة، أول رسالة، أول لحظة — كلها تبدأ من زر التوثيق.'
          }
          action={
            !query && filter === 'all' && !favoritesOnly ? (
              <Button variant="clay" onClick={() => open()}>
                وثّقوا لحظة
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-2">
          {chapters.map((chapter) => (
            <section key={chapter.key} className="mb-8">
              {/* عنوان الفصل */}
              <div className="flex items-baseline gap-2.5 mb-4 mt-2">
                <h2 className="font-display font-bold text-[19px] text-ink-900">{chapter.title}</h2>
                {chapter.subtitle && (
                  <span className="text-[12px] text-ink-400">{chapter.subtitle}</span>
                )}
                <span className="flex-1 h-px bg-line" />
              </div>

              <div className="timeline ps-6">
                {chapter.items.map((item) => (
                  <StoryEntry key={item.key} item={item} onOpen={() => setSelectedKey(item.key)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <DetailSheet item={selected} onClose={() => setSelectedKey(null)} />
    </>
  )
}

function DoorButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="flex items-center gap-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay-500 rounded-lg"
    >
      <span className="text-clay-500 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ============ عنصر في الخيط ============

const KIND_LABEL: Record<StoryItem['kind'], string> = {
  photo: 'صورة',
  letter: 'ذكرى مكتوبة',
  voice: 'رسالة صوتية',
  milestone: 'محطة كبيرة',
  capsule: 'رسالة للمستقبل',
  appointment: 'موعد',
  birth: 'الولادة',
}

function KindIcon({ kind, className }: { kind: StoryItem['kind']; className?: string }) {
  switch (kind) {
    case 'photo':
      return <CameraIcon className={className} />
    case 'letter':
      return <FeatherIcon className={className} />
    case 'voice':
      return <MicIcon className={className} />
    case 'milestone':
    case 'birth':
      return <StarIcon className={className} />
    case 'capsule':
      return <CapsuleIcon className={className} />
    case 'appointment':
      return <CalendarIcon className={className} />
  }
}

function StoryEntry({ item, onOpen }: { item: StoryItem; onOpen: () => void }) {
  const day = new Date(item.date).getDate()
  const highlight = item.kind === 'birth' || item.kind === 'milestone'

  if (highlight) {
    return <MilestoneStoryEntry item={item} onOpen={onOpen} day={day} />
  }

  return (
    <div className="relative pb-4">
      <span className={cx('timeline-node', highlight && 'timeline-node-active')} />

      <div className="card card-press !p-0 overflow-hidden">
        <button onClick={onOpen} className="block w-full text-right">
          {/* الصورة تملأ عرض البطاقة — الذكرى تستحق حجمًا */}
          {item.photo && (
            <img
              src={photoSrc(item.photo)}
              alt={item.body ?? 'ذكرى'}
              className="w-full aspect-[4/3] object-cover"
              loading="lazy"
            />
          )}
          {item.image && !item.photo && (
            <img src={item.image} alt={item.title ?? ''} className="w-full aspect-[4/3] object-cover" loading="lazy" />
          )}

          <div className="p-4">
            <div className="flex items-center gap-2 text-[11px] text-ink-400 mb-2">
              <KindIcon kind={item.kind} className="w-3.5 h-3.5" />
              <span>{KIND_LABEL[item.kind]}</span>
              <span className="text-ink-200">•</span>
              <span className="tnum">{day} {new Date(item.date).toLocaleDateString('ar', { month: 'long' })}</span>
              {item.author && (
                <>
                  <span className="text-ink-200">•</span>
                  <span>{parentLabel(item.author)}</span>
                </>
              )}
              {item.favorite && <HeartFillIcon className="w-3.5 h-3.5 text-clay-400 ms-auto" />}
            </div>

            {item.title && (
              <h3 className="font-display font-bold text-[17px] text-ink-900 leading-snug">
                {item.title}
              </h3>
            )}

            {item.locked ? (
              <p className="flex items-center gap-2 text-[13px] text-brass-600 mt-2">
                <LockIcon className="w-4 h-4" />
                مقفلة — {item.meta}
              </p>
            ) : (
              item.body && (
                <p
                  className={cx(
                    'prose-note mt-1.5',
                    item.kind === 'letter' ? 'line-clamp-4' : 'line-clamp-3',
                  )}
                >
                  {item.body}
                </p>
              )
            )}

            {item.meta && !item.locked && (
              <p className="text-[12px] text-ink-400 mt-2 tnum">{item.meta}</p>
            )}
          </div>
        </button>

        {/* المشغّل داخل البطاقة لكن خارج زرّ الفتح: زرّ داخل زرّ بناء غير
            صالح، والتشغيل يجب ألّا يفتح شاشة التفاصيل */}
        {item.voice && (
          <div className="px-4 pb-4 -mt-1">
            <VoicePlayer voice={item.voice} />
          </div>
        )}
        {item.attachments && <AttachmentStrip attachments={item.attachments} />}
      </div>
    </div>
  )
}

/** الصور والتسجيلات المضافة إلى ذكرى: مصغّرات للصور ومشغّل لكل تسجيل */
function AttachmentStrip({ attachments }: { attachments: NonNullable<StoryItem['attachments']> }) {
  const { photos, voices } = attachments
  if (photos.length === 0 && voices.length === 0) return null
  return (
    <div className="px-4 pb-4 -mt-1 space-y-3">
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((p) => (
            <img
              key={p.id}
              src={photoSrc(p)}
              alt={p.caption ?? 'صورة من الذكرى'}
              className="w-20 h-20 rounded-xl object-cover border border-line shrink-0"
              loading="lazy"
            />
          ))}
        </div>
      )}
      {voices.map((v) => (
        <VoicePlayer key={v.id} voice={v} />
      ))}
    </div>
  )
}

function MilestoneStoryEntry({
  item,
  onOpen,
  day,
}: {
  item: StoryItem
  onOpen: () => void
  day: number
}) {
  const birth = item.kind === 'birth'
  return (
    <div className="relative pb-4">
      <span className="timeline-node timeline-node-active" />
      <button
        onClick={onOpen}
        className="card card-press !p-0 overflow-hidden w-full text-right"
      >
        <div className="flex min-h-[6.5rem]">
          <div className={cx('w-1.5 shrink-0', birth ? 'bg-brass-400' : 'bg-clay-400')} />
          <div className="p-4 flex-1 min-w-0">
            <div className={cx('flex items-center gap-2 text-[11px] mb-2', birth ? 'text-brass-700' : 'text-clay-600')}>
              <StarIcon className="w-3.5 h-3.5" />
              <span>{birth ? 'يوم الولادة' : 'محطة كبيرة'}</span>
              <span className="text-ink-200">•</span>
              <span className="tnum">{day} {new Date(item.date).toLocaleDateString('ar', { month: 'long' })}</span>
            </div>
            <h3 className="font-display font-bold text-[18px] text-ink-900 leading-snug">
              {item.title}
            </h3>
            {item.body && <p className="prose-note mt-1.5 line-clamp-3">{item.body}</p>}
          </div>
        </div>
      </button>
    </div>
  )
}

// ============ تفاصيل العنصر ============

/** صفحة المحطة: ما وُثّق في اليوم نفسه، للعرض فقط */
function SameDayMemories({ item }: { item: StoryItem }) {
  const data = useAppData()
  const related = useMemo(() => sameDayItems(buildStory(data), item), [data, item])
  if (related.length === 0) return null
  return (
    <div className="card !bg-paper-100 mb-4">
      <div className="eyebrow mb-2">من اليوم نفسه</div>
      <ul className="space-y-1.5">
        {related.map((r) => (
          <li key={r.key} className="text-[13px] text-ink-600 flex items-center gap-2">
            <KindIcon kind={r.kind} className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{r.title || r.body || KIND_LABEL[r.kind]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DetailSheet({ item, onClose }: { item: StoryItem | null; onClose: () => void }) {
  const data = useAppData()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [sharing, setSharing] = useState(false)
  const { toast, open: openCapture } = useCapture()

  // نُهيّئ حقول التعديل عند فتح عنصر جديد
  const key = item?.key ?? ''
  const [loadedKey, setLoadedKey] = useState('')
  if (item && key !== loadedKey) {
    setLoadedKey(key)
    setTitle(item.title ?? '')
    setText(item.body ?? '')
    setEditing(false)
  }

  if (!item) return null

  const editable = ['photo', 'letter', 'milestone', 'voice'].includes(item.kind)
  // المحطات الجاهزة لا تُحذف من هنا (شاشة الأحداث لا تحذفها أيضًا ولا تعيدها)
  const builtInMilestone =
    item.kind === 'milestone' && !!data.milestones.find((m) => m.id === item.id)?.builtIn
  const deletable =
    ['photo', 'letter', 'milestone', 'capsule', 'voice'].includes(item.kind) && !builtInMilestone
  // الكبسولة المقفلة لا تُشارَك: نصّها سرّ حتى موعده
  const shareable = !item.locked

  // نص الذكرى وعنوان المحطة لا يصحّ أن يكونا فارغين: الصفّ الفارغ يسقطه
  // التحقّق عند التحميل التالي فتضيع الذكرى بعد أن بدت محفوظة
  const blankRequired =
    (item.kind === 'letter' && !text.trim()) || (item.kind === 'milestone' && !title.trim())

  const save = async () => {
    if (blankRequired) return
    let ok = true
    if (item.kind === 'photo') ok = await updatePhoto(item.id, { caption: text.trim() || undefined })
    else if (item.kind === 'letter')
      ok = await updateJournal(item.id, { title: title.trim() || undefined, text: text.trim() })
    else if (item.kind === 'milestone')
      ok = await updateMilestone(item.id, { title: title.trim(), note: text.trim() || undefined })
    else if (item.kind === 'voice') ok = await updateVoice(item.id, { title: title.trim() || undefined })
    if (!ok) {
      toast('لم يُحفظ التعديل — المساحة ممتلئة أو التخزين غير متاح')
      return
    }
    setEditing(false)
    toast('حُفظ التعديل')
  }

  /** بطاقة صورة أنيقة بدل لقطة الشاشة */
  const share = async () => {
    setSharing(true)
    try {
      const at = new Date(item.date)
      const stage = stageLabel(data.child, at)
      const blob = await buildShareCard({
        imageSrc: item.photo ? photoSrc(item.photo) : (item.image ?? undefined),
        title: item.title,
        body: item.body ?? (item.voice ? 'رسالة صوتية' : undefined),
        meta: stage ? `${formatDate(item.date)} • ${stage}` : formatDate(item.date),
        childName: data.child.name || 'طفلنا',
      })
      const outcome = await shareCard(blob, `tafalna-${item.key.replace(':', '-')}.png`)
      if (outcome === 'downloaded') toast('نُزّلت البطاقة كصورة')
    } catch {
      toast('تعذّر تجهيز البطاقة')
    } finally {
      setSharing(false)
    }
  }

  const remove = async () => {
    let ok = true
    if (item.kind === 'photo') ok = await deletePhoto(item.id)
    else if (item.kind === 'letter') ok = await deleteJournal(item.id)
    else if (item.kind === 'milestone') ok = await deleteMilestone(item.id)
    else if (item.kind === 'capsule') ok = await deleteCapsule(item.id)
    else if (item.kind === 'voice') ok = await deleteVoice(item.id)
    setConfirmDelete(false)
    if (!ok) {
      toast('لم يتم الحذف — تعذّر حفظ التغيير على هذا الجهاز')
      return
    }
    onClose()
    toast('حُذف العنصر')
  }

  return (
    <>
      <Sheet
        open={!!item}
        onClose={onClose}
        title={item.title || KIND_LABEL[item.kind]}
        subtitle={`${formatDate(item.date)}${item.author ? ` • بقلم ${parentLabel(item.author)}` : ''}`}
      >
        {item.kind !== 'birth' && (
          <RecordSyncLine id={item.id} mediaOnly={item.kind === 'photo' || item.kind === 'voice'} />
        )}
        {item.photo && (
          <img
            src={photoSrc(item.photo)}
            alt={item.body ?? 'ذكرى'}
            className="w-full rounded-2xl border border-line mb-4"
          />
        )}
        {item.image && !item.photo && (
          <img src={item.image} alt="" className="w-full rounded-2xl border border-line mb-4" />
        )}
        {item.voice && (
          <div className="card !bg-paper-100 mb-4">
            <VoicePlayer voice={item.voice} />
          </div>
        )}
        {(item.kind === 'milestone' || item.kind === 'birth') && (
          <SameDayMemories item={item} />
        )}
        {item.attachments?.photos.map((p) => (
          <img
            key={p.id}
            src={photoSrc(p)}
            alt={p.caption ?? 'صورة من الذكرى'}
            className="w-full rounded-2xl border border-line mb-4"
          />
        ))}
        {item.attachments?.voices.map((v) => (
          <div key={v.id} className="card !bg-paper-100 mb-4">
            <VoicePlayer voice={v} />
          </div>
        ))}

        {editing ? (
          <>
            {item.kind !== 'photo' && (
              <Field label="العنوان">
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
            )}
            {item.kind !== 'voice' && (
              <Field label={item.kind === 'photo' ? 'التعليق' : 'النص'}>
                <textarea
                  className="input font-serif leading-[1.9] min-h-[8rem]"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </Field>
            )}
            <div className="flex gap-2.5">
              <Button onClick={save} disabled={blankRequired} className="flex-1">
                <CheckIcon className="w-4 h-4" /> حفظ
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                إلغاء
              </Button>
            </div>
          </>
        ) : (
          <>
            {item.locked ? (
              <p className="flex items-center gap-2 text-brass-600 bg-brass-50 border border-brass-100 rounded-2xl p-4">
                <LockIcon className="w-5 h-5 shrink-0" />
                هذي الكبسولة مقفلة — {item.meta}
              </p>
            ) : (
              item.body && (
                <div className="relative">
                  {item.kind === 'letter' && (
                    <QuoteIcon className="w-6 h-6 text-clay-100 absolute -top-1 -start-1" />
                  )}
                  <p className="prose-note whitespace-pre-wrap relative">{item.body}</p>
                </div>
              )
            )}
            {item.meta && !item.locked && (
              <p className="text-[13px] text-ink-400 mt-3 tnum">{item.meta}</p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-5 border-t border-line">
              {item.kind === 'photo' && (
                <button
                  onClick={() => togglePhotoFavorite(item.id)}
                  className={cx('btn-ghost', item.favorite && '!bg-clay-500 !text-white')}
                >
                  {item.favorite ? (
                    <HeartFillIcon className="w-4 h-4" />
                  ) : (
                    <HeartIcon className="w-4 h-4" />
                  )}
                  مفضّلة
                </button>
              )}
              {shareable && (
                <button onClick={() => void share()} disabled={sharing} className="btn-ghost">
                  <ShareIcon className="w-4 h-4" /> {sharing ? 'جارٍ التجهيز…' : 'مشاركة'}
                </button>
              )}
              {item.kind === 'letter' && (
                <>
                  <button
                    onClick={() => {
                      onClose()
                      openCapture('photo', { memoryId: item.id })
                    }}
                    className="btn-ghost"
                  >
                    <CameraIcon className="w-4 h-4" /> إضافة صورة
                  </button>
                  <button
                    onClick={() => {
                      onClose()
                      openCapture('voice', { memoryId: item.id })
                    }}
                    className="btn-ghost"
                  >
                    <MicIcon className="w-4 h-4" /> إضافة صوت
                  </button>
                </>
              )}
              {editable && (
                <button onClick={() => setEditing(true)} className="btn-ghost">
                  <EditIcon className="w-4 h-4" /> تعديل
                </button>
              )}
              {deletable && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="btn-ghost !text-clay-600 ms-auto"
                >
                  <TrashIcon className="w-4 h-4" /> حذف
                </button>
              )}
            </div>
          </>
        )}
      </Sheet>

      <Confirm
        open={confirmDelete}
        title="حذف نهائي"
        message={
          item.attachments?.photos.length || item.attachments?.voices.length
            ? 'بتُحذف هذه الذكرى ولا يمكن التراجع، أما صورها وتسجيلاتها فتبقى في الحكاية. متأكدين؟'
            : 'بيُحذف من الذكريات ومن الكتاب، ولا يمكن التراجع. متأكدين؟'
        }
        confirmLabel="احذف"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
