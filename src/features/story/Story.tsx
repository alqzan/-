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
import { formatDate, parentLabel, pluralAr } from '../../lib/format'
import { photoSrc } from '../../lib/image'
import { useNow } from '../../lib/useNow'
import {
  buildStory,
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
  { value: 'letter', label: 'رسائل' },
  { value: 'voice', label: 'أصوات' },
  { value: 'milestone', label: 'لحظات' },
]

export default function Story() {
  const data = useAppData()
  const navigate = useNavigate()
  const { open } = useCapture()
  const [filter, setFilter] = useState<StoryFilter>('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<StoryItem | null>(null)
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
        <div className="eyebrow">سيرة {data.child.name || 'صغيرنا'}</div>
        <h1 className="title-lg mt-1.5">الحكاية</h1>
        <p className="text-[13px] text-ink-400 mt-1.5">
          {pluralAr(stats.photos, 'صورة واحدة', 'صورتان', 'صور', 'صورة')}
          {' • '}
          {pluralAr(stats.letters, 'رسالة واحدة', 'رسالتان', 'رسائل', 'رسالة')}
          {' • '}
          {pluralAr(stats.voices, 'تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلًا')}
          {' • '}
          {pluralAr(stats.milestones, 'لحظة واحدة', 'لحظتان', 'لحظات', 'لحظة')}
        </p>
      </header>

      {/* أبواب الحكاية الثلاثة */}
      <div className="grid grid-cols-3 gap-2.5">
        <DoorButton
          icon={<StoryIcon className="w-5 h-5" />}
          label="الكتاب"
          onClick={() => navigate('/story/book')}
        />
        <DoorButton
          icon={<StarIcon className="w-5 h-5" />}
          label="المعالم"
          onClick={() => navigate('/story/milestones')}
        />
        <DoorButton
          icon={<CapsuleIcon className="w-5 h-5" />}
          label="الكبسولات"
          onClick={() => navigate('/story/capsules')}
        />
      </div>

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
          title={query || filter !== 'all' || favoritesOnly ? 'ما فيه شي هنا' : 'الحكاية ما بدأت بعد'}
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
                  <StoryEntry key={item.key} item={item} onOpen={() => setSelected(item)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <DetailSheet item={selected} onClose={() => setSelected(null)} />
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
      className="card card-press !p-3 flex flex-col items-center gap-1.5 text-ink-700"
    >
      <span className="text-clay-500">{icon}</span>
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  )
}

// ============ عنصر في الخيط ============

const KIND_LABEL: Record<StoryItem['kind'], string> = {
  photo: 'صورة',
  letter: 'رسالة',
  voice: 'رسالة صوتية',
  milestone: 'لحظة أولى',
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
      </div>
    </div>
  )
}

// ============ تفاصيل العنصر ============

function DetailSheet({ item, onClose }: { item: StoryItem | null; onClose: () => void }) {
  const data = useAppData()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [sharing, setSharing] = useState(false)
  const { toast } = useCapture()

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
  const deletable = ['photo', 'letter', 'milestone', 'capsule', 'voice'].includes(item.kind)
  // الكبسولة المقفلة لا تُشارَك: نصّها سرّ حتى موعده
  const shareable = !item.locked

  const save = async () => {
    if (item.kind === 'photo') await updatePhoto(item.id, { caption: text.trim() || undefined })
    else if (item.kind === 'letter')
      await updateJournal(item.id, { title: title.trim() || undefined, text: text.trim() })
    else if (item.kind === 'milestone')
      await updateMilestone(item.id, { title: title.trim(), note: text.trim() || undefined })
    else if (item.kind === 'voice') await updateVoice(item.id, { title: title.trim() || undefined })
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
    if (item.kind === 'photo') await deletePhoto(item.id)
    else if (item.kind === 'letter') await deleteJournal(item.id)
    else if (item.kind === 'milestone') await deleteMilestone(item.id)
    else if (item.kind === 'capsule') await deleteCapsule(item.id)
    else if (item.kind === 'voice') await deleteVoice(item.id)
    setConfirmDelete(false)
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
              <Button onClick={save} className="flex-1">
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
        message="بيُحذف من الحكاية ومن كتاب الذكريات ولا يمكن التراجع. متأكدين؟"
        confirmLabel="احذف"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
