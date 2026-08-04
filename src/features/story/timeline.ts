// =============================================================
// «الحكاية» — تجميع كل ما وثّقه الوالدان في خيط زمني واحد.
//
// هذا الملف لا يعرف شيئًا عن React: يحوّل بيانات التطبيق إلى عناصر
// مرتّبة زمنيًا ومقسّمة إلى فصول. الفصل يحمل عمر الطفل في ذلك الشهر
// (أسبوع حمل أو شهر عمر) — وهذا ما يحوّل القائمة إلى سيرة.
// =============================================================
import type {
  AppData,
  Appointment,
  ChildProfile,
  GrowthEntry,
  JournalEntry,
  Milestone,
  Parent,
  Photo,
  TimeCapsule,
  VoiceNote,
} from '../../data/types'
import { getPregnancyProgress } from '../../lib/pregnancy'

export type StoryKind =
  | 'photo'
  | 'letter'
  | 'voice'
  | 'milestone'
  | 'capsule'
  | 'appointment'
  | 'growth'
  | 'birth'

export type StoryFilter = 'all' | 'photo' | 'letter' | 'voice' | 'milestone'

export interface StoryItem {
  /** معرّف فريد داخل الخيط (النوع + معرّف السجل) */
  key: string
  id: string
  kind: StoryKind
  /** تاريخ الحدث — ISO */
  date: string
  title?: string
  body?: string
  author?: Parent
  favorite?: boolean
  /** الصورة الأصلية (إن كان العنصر صورة أو موعدًا بصورة سونار) */
  photo?: Photo
  image?: string | null
  /** بيانات إضافية تعرضها البطاقة (وزن/طول، حالة الكبسولة…) */
  meta?: string
  /** كبسولة لم يحن موعدها بعد */
  locked?: boolean
  /** التسجيل الصوتي — يُشغَّل داخل البطاقة */
  voice?: VoiceNote
}

export interface StoryChapter {
  /** مفتاح ترتيبي: YYYY-MM */
  key: string
  /** «مارس ٢٠٢٦» */
  title: string
  /** «الأسبوع ٢٤ من الحمل» أو «الشهر الثاني» */
  subtitle: string
  items: StoryItem[]
}

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

const KIND_OF_FILTER: Record<Exclude<StoryFilter, 'all'>, StoryKind[]> = {
  photo: ['photo'],
  letter: ['letter', 'capsule'],
  voice: ['voice'],
  milestone: ['milestone', 'birth', 'growth', 'appointment'],
}

function photoItem(p: Photo): StoryItem {
  return {
    key: `photo:${p.id}`,
    id: p.id,
    kind: 'photo',
    date: p.date,
    body: p.caption,
    author: p.author,
    favorite: p.favorite,
    photo: p,
  }
}

function voiceItem(v: VoiceNote): StoryItem {
  return {
    key: `voice:${v.id}`,
    id: v.id,
    kind: 'voice',
    date: v.date,
    title: v.title,
    author: v.author,
    voice: v,
  }
}

function letterItem(j: JournalEntry): StoryItem {
  return {
    key: `letter:${j.id}`,
    id: j.id,
    kind: 'letter',
    date: j.date,
    title: j.title,
    body: j.text,
    author: j.author,
  }
}

function milestoneItem(m: Milestone): StoryItem | null {
  if (!m.achievedAt) return null
  return {
    key: `milestone:${m.id}`,
    id: m.id,
    kind: 'milestone',
    date: m.achievedAt,
    title: m.title,
    body: m.note,
  }
}

function capsuleItem(c: TimeCapsule, now: Date): StoryItem {
  const locked = new Date(c.openAt).getTime() > now.getTime()
  return {
    key: `capsule:${c.id}`,
    id: c.id,
    kind: 'capsule',
    // الكبسولة تعيش في الخيط عند تاريخ كتابتها — هناك كانت اللحظة
    date: c.createdAt,
    title: c.title,
    body: locked ? undefined : c.message,
    author: c.author,
    locked,
    meta: locked ? `تُفتح في ${formatDay(c.openAt)}` : `فُتحت في ${formatDay(c.openAt)}`,
  }
}

function appointmentItem(a: Appointment, now: Date): StoryItem | null {
  // المواعيد القادمة مكانها شاشة المتابعة، أما الحكاية فتحكي ما مضى
  if (new Date(a.dateTime).getTime() > now.getTime()) return null
  return {
    key: `appointment:${a.id}`,
    id: a.id,
    kind: 'appointment',
    date: a.dateTime,
    title: a.title,
    body: a.notes,
    image: a.image ?? null,
    meta: a.location,
  }
}

function growthItem(g: GrowthEntry): StoryItem | null {
  const bits: string[] = []
  if (g.weightKg) bits.push(`${g.weightKg} كجم`)
  if (g.lengthCm) bits.push(`${g.lengthCm} سم`)
  if (g.headCm) bits.push(`محيط الرأس ${g.headCm} سم`)
  if (bits.length === 0) return null
  return {
    key: `growth:${g.id}`,
    id: g.id,
    kind: 'growth',
    date: g.date,
    title: 'قياس جديد',
    meta: bits.join(' • '),
  }
}

function birthItem(child: ChildProfile): StoryItem | null {
  if (!child.bornAt) return null
  const bits: string[] = []
  if (child.birthWeightKg) bits.push(`${child.birthWeightKg} كجم`)
  if (child.birthLengthCm) bits.push(`${child.birthLengthCm} سم`)
  return {
    key: 'birth',
    id: 'birth',
    kind: 'birth',
    date: child.bornAt,
    title: `أهلًا يا ${child.name || 'صغيرنا'}`,
    body: 'يوم اللقاء الأول.',
    meta: bits.join(' • ') || undefined,
  }
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** كل ما وُثّق، مرتّبًا من الأحدث إلى الأقدم */
export function buildStory(data: AppData, now: Date = new Date()): StoryItem[] {
  const items: StoryItem[] = [
    ...data.photos.map(photoItem),
    ...data.journal.map(letterItem),
    ...data.voices.map(voiceItem),
    ...data.milestones.map(milestoneItem).filter(isItem),
    ...data.capsules.map((c) => capsuleItem(c, now)),
    ...data.appointments.map((a) => appointmentItem(a, now)).filter(isItem),
    ...data.growth.map(growthItem).filter(isItem),
    birthItem(data.child),
  ].filter(isItem)

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function isItem(v: StoryItem | null): v is StoryItem {
  return v !== null
}

export function filterStory(items: StoryItem[], filter: StoryFilter): StoryItem[] {
  if (filter === 'all') return items
  const kinds = KIND_OF_FILTER[filter]
  return items.filter((i) => kinds.includes(i.kind))
}

export function searchStory(items: StoryItem[], query: string): StoryItem[] {
  const q = query.trim()
  if (!q) return items
  return items.filter((i) =>
    `${i.title ?? ''} ${i.body ?? ''} ${i.meta ?? ''}`.includes(q),
  )
}

/**
 * وصف المرحلة في تاريخ معيّن: أسبوع الحمل قبل الولادة، وعمر الطفل بعدها.
 * هو ما يحوّل عنوان الشهر من تاريخ مجرّد إلى موضع في الرحلة.
 */
export function stageLabel(child: ChildProfile, at: Date): string {
  if (child.bornAt) {
    const born = new Date(child.bornAt)
    if (at.getTime() >= startOfMonth(born).getTime()) {
      const months =
        (at.getFullYear() - born.getFullYear()) * 12 + (at.getMonth() - born.getMonth())
      if (months <= 0) return 'شهر الولادة'
      if (months === 1) return 'الشهر الأول'
      if (months === 2) return 'الشهر الثاني'
      if (months < 12) return `الشهر ${months}`
      const years = Math.floor(months / 12)
      const rest = months % 12
      return rest === 0
        ? years === 1
          ? 'السنة الأولى'
          : `${years} سنوات`
        : `${years} سنة و${rest} شهر`
    }
  }

  const p = getPregnancyProgress(child.lmpDate, child.dueDate, at)
  if (p && p.week >= 1 && p.week <= 42) return `الأسبوع ${p.week} من الحمل`
  return ''
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** تقسيم الخيط إلى فصول شهرية — الأحدث أولًا */
export function chapterize(items: StoryItem[], child: ChildProfile): StoryChapter[] {
  const map = new Map<string, StoryItem[]>()
  for (const item of items) {
    const d = new Date(item.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bucket = map.get(key)
    if (bucket) bucket.push(item)
    else map.set(key, [item])
  }

  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, chapterItems]) => {
      const [year, month] = key.split('-').map(Number)
      // منتصف الشهر: أدقّ تمثيل لمرحلة الشهر كله من أوّل يوم فيه
      const mid = new Date(year, month - 1, 15)
      return {
        key,
        title: `${MONTHS[month - 1]} ${year}`,
        subtitle: stageLabel(child, mid),
        items: chapterItems,
      }
    })
}

/** إحصاءات الحكاية — تُعرض في رأس الشاشة وفي غلاف الكتاب */
export function storyStats(data: AppData) {
  return {
    photos: data.photos.length,
    letters: data.journal.length,
    voices: data.voices.length,
    milestones: data.milestones.filter((m) => m.achievedAt).length,
    capsules: data.capsules.length,
    total:
      data.photos.length +
      data.journal.length +
      data.voices.length +
      data.milestones.filter((m) => m.achievedAt).length +
      data.capsules.length,
  }
}
