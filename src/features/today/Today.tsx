import { useNavigate } from 'react-router-dom'
import { Card, ProgressRing, StatTile } from '../../components/ui'
import {
  ArchiveIcon,
  ChevronLeftIcon,
  BottleIcon,
  CalendarIcon,
  CameraIcon,
  DropIcon,
  FeatherIcon,
  MoonIcon,
  StarIcon,
} from '../../components/icons'
import { FetalFigure, Monogram } from '../../components/illustrations'
import { useCapture } from '../../components/Capture'
import { useAppData } from '../../data/dataService'
import { getPregnancyProgress, trimesterLabel } from '../../lib/pregnancy'
import { getFetalWeek } from '../../lib/fetalData'
import { formatDate, formatTime, pluralAr, relativeFromNow } from '../../lib/format'
import { ageInDays, ageInMonths, isSameLocalDay } from '../../lib/localDate'
import { daysSinceBackup } from '../../lib/backup'
import { photoSrc } from '../../lib/image'
import { promptOfTheDay } from '../../lib/prompts'
import { useNow } from '../../lib/useNow'
import { buildStory } from '../story/timeline'
import type { JournalEntry, Photo } from '../../data/types'

// =============================================================
// «اليوم» — شاشة واحدة تجيب عن سؤالين: وين صرنا؟ ووش نوثّق اليوم؟
// =============================================================

export default function Today() {
  const data = useAppData()
  const navigate = useNavigate()
  const { open } = useCapture()
  const born = !!data.child.bornAt

  // «الموعد القادم» يتحوّل إلى ماضٍ بمرور الوقت — نتفقّده كل دقيقة
  const now = useNow(60000)
  const nextAppt = [...data.appointments]
    .filter((a) => new Date(a.dateTime).getTime() >= now)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0]

  const flashback = findFlashback(data.photos, data.journal)
  const story = buildStory(data, new Date(now))
  const recent = story.slice(0, 6)
  const hasContent = recent.length > 0
  const sinceBackup = daysSinceBackup()
  const needsBackup = hasContent && (sinceBackup === null || sinceBackup > 30)
  const prompt = promptOfTheDay(born)

  const today = new Date(now)

  return (
    <>
      <header className="pt-6 pb-5">
        <div className="eyebrow">
          {today.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 className="title-lg mt-1.5">
          {born ? `${data.child.name || 'صغيرنا'} معكم اليوم` : 'رحلتكم إليه'}
        </h1>
      </header>

      {born ? <NewbornHero /> : <PregnancyHero />}

      {/* سؤال اليوم — الدافع الأساسي للتوثيق */}
      <button
        onClick={() => open('letter', { title: prompt })}
        className="card card-press w-full text-right mt-4 bg-clay-50 border-clay-100 flex items-start gap-3.5"
      >
        <span className="w-10 h-10 rounded-full bg-white/70 text-clay-500 grid place-items-center shrink-0">
          <FeatherIcon className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="eyebrow text-clay-500">سؤال اليوم</span>
          <span className="block font-serif text-[16px] leading-[1.8] text-ink-800 mt-1">
            {prompt}
          </span>
        </span>
        <ChevronLeftIcon className="w-4 h-4 text-clay-300 mt-3 shrink-0" />
      </button>

      {born && <TodaySummary />}

      {/* في مثل هذا اليوم */}
      {flashback && (
        <section className="mt-7">
          <div className="eyebrow mb-2.5">في مثل هذا اليوم</div>
          <Card onClick={() => navigate('/story')} className="flex items-center gap-3.5">
            {flashback.kind === 'photo' ? (
              <img
                src={photoSrc(flashback.photo)}
                alt={flashback.photo.caption ?? 'ذكرى'}
                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-line"
              />
            ) : (
              <span className="w-16 h-16 rounded-xl bg-paper-200 text-ink-400 grid place-items-center shrink-0">
                <FeatherIcon className="w-6 h-6" />
              </span>
            )}
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] text-clay-500 mb-1">{flashback.label}</span>
              <span className="block font-serif text-[15px] leading-[1.7] text-ink-700 line-clamp-2">
                {flashback.kind === 'photo'
                  ? (flashback.photo.caption ?? 'صورة من ذلك اليوم')
                  : flashback.entry.text}
              </span>
            </span>
          </Card>
        </section>
      )}

      {/* الموعد القادم */}
      {nextAppt && (
        <section className="mt-7">
          <div className="eyebrow mb-2.5">الموعد القادم</div>
          <Card onClick={() => navigate('/track/appointments')} className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-full bg-moss-50 text-moss-500 grid place-items-center shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-ink-900 truncate">{nextAppt.title}</span>
              <span className="block text-[13px] text-ink-400 mt-0.5">
                {formatDate(nextAppt.dateTime)} • {formatTime(nextAppt.dateTime)}
              </span>
            </span>
            <span className="chip shrink-0">{untilLabel(nextAppt.dateTime, now)}</span>
          </Card>
        </section>
      )}

      {/* آخر ما وُثّق */}
      {hasContent && (
        <section className="mt-7">
          <div className="flex items-end justify-between mb-2.5">
            <div className="eyebrow">آخر ما وثّقتم</div>
            <button
              onClick={() => navigate('/story')}
              className="text-[13px] text-clay-500 font-medium"
            >
              الحكاية كاملة
            </button>
          </div>
          {/* شريط أفقي: نظرة سريعة دون أن تبتلع الشاشة */}
          <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1">
            {recent.map((item) => (
              <button
                key={item.key}
                onClick={() => navigate('/story')}
                className="shrink-0 w-[7.5rem] text-right"
              >
                {item.photo ? (
                  <img
                    src={photoSrc(item.photo)}
                    alt={item.body ?? 'ذكرى'}
                    className="w-[7.5rem] h-[7.5rem] rounded-xl object-cover border border-line"
                  />
                ) : (
                  <span className="w-[7.5rem] h-[7.5rem] rounded-xl bg-paper-100 border border-line
                                   grid place-items-center text-ink-300">
                    {item.kind === 'milestone' || item.kind === 'birth' ? (
                      <StarIcon className="w-6 h-6" />
                    ) : (
                      <FeatherIcon className="w-6 h-6" />
                    )}
                  </span>
                )}
                <span className="block text-[11px] text-ink-400 mt-1.5 truncate">
                  {item.title ?? item.body ?? 'ذكرى'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* بدايةٌ فارغة: ندعو للتوثيق بدل ترك الشاشة صامتة */}
      {!hasContent && (
        <Card className="mt-7 text-center">
          <CameraIcon className="w-7 h-7 text-ink-300 mx-auto" />
          <p className="font-display font-bold text-ink-800 mt-3">حكايته تبدأ بأول شي توثّقونه</p>
          <p className="text-sm text-ink-400 mt-1.5 leading-relaxed">
            صورة، أو سطر واحد — بعد سنة بتشكرون نفسكم عليه.
          </p>
          <button onClick={() => open()} className="btn-clay mt-4 mx-auto">
            وثّقوا أول لحظة
          </button>
        </Card>
      )}

      {/* تذكير بالنسخة الاحتياطية — البيانات محفوظة على هذا الجهاز فقط */}
      {needsBackup && (
        <Card
          onClick={() => navigate('/settings')}
          className="mt-7 !bg-brass-50 !border-brass-100 flex items-center gap-3.5"
        >
          <span className="w-10 h-10 rounded-full bg-white/70 text-brass-500 grid place-items-center shrink-0">
            <ArchiveIcon className="w-5 h-5" />
          </span>
          <span className="flex-1">
            <span className="block font-medium text-ink-900 text-[15px]">احفظوا نسخة من ذكرياتكم</span>
            <span className="block text-[12px] text-ink-500 mt-0.5 leading-relaxed">
              {sinceBackup === null
                ? 'ما أُخذت نسخة احتياطية بعد — كل شيء محفوظ على هذا الجهاز فقط.'
                : `آخر نسخة قبل ${pluralAr(sinceBackup, 'يوم', 'يومين', 'أيام', 'يومًا')}.`}
            </span>
          </span>
        </Card>
      )}
    </>
  )
}

/** «اليوم» / «بكرة» / «بعد ٣ أيام» — الصيغة النسبية الجاهزة تصف الماضي فقط */
function untilLabel(iso: string, now: number): string {
  const days = Math.ceil((new Date(iso).getTime() - now) / 86400000)
  if (days <= 0) return 'اليوم'
  if (days === 1) return 'بكرة'
  return `بعد ${pluralAr(days, 'يوم', 'يومين', 'أيام', 'يومًا')}`
}

// ============ بطاقات المرحلة ============

function PregnancyHero() {
  const data = useAppData()
  const navigate = useNavigate()
  const p = getPregnancyProgress(data.child.lmpDate, data.child.dueDate)

  if (!p) {
    return (
      <Card onClick={() => navigate('/settings')} className="text-center">
        <p className="font-display font-bold text-ink-800">أضيفوا موعد الولادة</p>
        <p className="text-sm text-ink-400 mt-1">حتى يحسب التطبيق الأسابيع ويكتب الفصول.</p>
      </Card>
    )
  }

  const fetal = getFetalWeek(p.week)

  return (
    <Card onClick={() => navigate('/track/development')} className="!p-5">
      <div className="flex items-center gap-5">
        <ProgressRing value={p.progress} size={116} stroke={5}>
          <div className="text-center leading-none">
            <div className="font-display font-bold text-[34px] text-ink-900 tnum">{p.week}</div>
            <div className="text-[11px] text-ink-400 mt-1">الأسبوع</div>
          </div>
        </ProgressRing>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="chip-clay">{trimesterLabel(p.trimester)}</span>
            <span className="text-[12px] text-ink-400">
              {p.dayOfWeek === 0 ? 'أول أيام الأسبوع' : `اليوم ${p.dayOfWeek + 1}`}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <FetalFigure week={p.week} className="w-12 h-12 text-clay-500 shrink-0" />
            <div className="min-w-0">
              <div className="font-display font-bold text-ink-900 text-[17px] truncate">
                بحجم {fetal.fruit}
              </div>
              <div className="text-[12px] text-ink-400 mt-0.5 tnum">
                {fetal.lengthCm} سم • {fetal.weightG >= 1000
                  ? `${(fetal.weightG / 1000).toFixed(2)} كجم`
                  : `${fetal.weightG} جم`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rule-dot my-4" />

      <div className="flex items-center justify-between text-[13px]">
        <span className="text-ink-500">
          باقٍ <strong className="text-ink-900 tnum">{Math.max(0, p.daysLeft)}</strong> يوم
        </span>
        <span className="text-ink-400">
          موعد اللقاء {data.child.dueDate ? formatDate(data.child.dueDate) : '—'}
        </span>
      </div>
    </Card>
  )
}

function NewbornHero() {
  const data = useAppData()
  const navigate = useNavigate()
  const bornAt = data.child.bornAt!
  const days = ageInDays(bornAt)
  const months = ageInMonths(bornAt)
  const weeks = Math.floor(days / 7)

  return (
    <Card onClick={() => navigate('/track')} className="!p-5">
      <div className="flex items-center gap-4">
        {data.child.photo ? (
          <img
            src={data.child.photo}
            alt={data.child.name}
            className="w-16 h-16 rounded-full object-cover border border-line shrink-0"
          />
        ) : (
          <Monogram name={data.child.name} className="w-16 h-16 text-2xl shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[22px] text-ink-900 truncate">
            {data.child.name || 'صغيرنا'}
          </div>
          <div className="text-[13px] text-ink-400 mt-0.5">
            وصل في {formatDate(bornAt)}
          </div>
        </div>
      </div>

      <div className="rule-dot my-4" />

      <div className="grid grid-cols-3 text-center">
        <AgeCell value={days} label="يوم" />
        <AgeCell value={weeks} label="أسبوع" />
        <AgeCell value={months} label="شهر" />
      </div>
    </Card>
  )
}

function AgeCell({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display font-bold text-[26px] text-ink-900 leading-none tnum">{value}</div>
      <div className="text-[11px] text-ink-400 mt-1.5">{label}</div>
    </div>
  )
}

function TodaySummary() {
  const data = useAppData()
  const navigate = useNavigate()
  const feeds = data.feedings.filter((f) => isSameLocalDay(f.startedAt)).length
  const diapers = data.diapers.filter((d) => isSameLocalDay(d.time)).length
  const lastFeed = [...data.feedings].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )[0]
  const sleepMin = data.sleep
    .filter((s) => s.endedAt && isSameLocalDay(s.startedAt))
    .reduce(
      (sum, s) =>
        sum + (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000,
      0,
    )

  return (
    <section className="mt-7">
      <div className="flex items-end justify-between mb-2.5">
        <div className="eyebrow">يوم اليوم</div>
        <button onClick={() => navigate('/track')} className="text-[13px] text-clay-500 font-medium">
          المتابعة
        </button>
      </div>
      <div className="flex gap-2.5">
        <StatTile label="رضعات" value={feeds} icon={<BottleIcon className="w-4 h-4" />} />
        <StatTile label="حفاضات" value={diapers} icon={<DropIcon className="w-4 h-4" />} />
        <StatTile
          label="نوم"
          value={
            sleepMin >= 60
              ? `${Math.floor(sleepMin / 60)}س ${Math.round(sleepMin % 60)}د`
              : sleepMin > 0
                ? `${Math.round(sleepMin)} د`
                : '—'
          }
          icon={<MoonIcon className="w-4 h-4" />}
        />
      </div>
      {lastFeed && (
        <p className="text-[12px] text-ink-400 mt-2.5">
          آخر رضعة {relativeFromNow(lastFeed.startedAt)}
        </p>
      )}
    </section>
  )
}

// ============================================================
// «في مثل هذا اليوم»: ذكرى من التاريخ نفسه في سنة سابقة،
// وإلا أقدم ذكرى مضى عليها أكثر من شهر لإحياء ما يُنسى.
// ============================================================

type Flashback =
  | { kind: 'photo'; photo: Photo; label: string }
  | { kind: 'journal'; entry: JournalEntry; label: string }

function findFlashback(photos: Photo[], journal: JournalEntry[]): Flashback | null {
  const now = new Date()
  const sameDay = (iso: string) => {
    const d = new Date(iso)
    return (
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate() &&
      d.getFullYear() < now.getFullYear()
    )
  }

  const photoMatch = photos.find((p) => sameDay(p.date))
  if (photoMatch) {
    const years = now.getFullYear() - new Date(photoMatch.date).getFullYear()
    return {
      kind: 'photo',
      photo: photoMatch,
      label: `قبل ${pluralAr(years, 'سنة', 'سنتين', 'سنوات', 'سنة')}`,
    }
  }

  const journalMatch = journal.find((j) => sameDay(j.date))
  if (journalMatch) {
    const years = now.getFullYear() - new Date(journalMatch.date).getFullYear()
    return {
      kind: 'journal',
      entry: journalMatch,
      label: `قبل ${pluralAr(years, 'سنة', 'سنتين', 'سنوات', 'سنة')}`,
    }
  }

  // لا ذكرى في التاريخ نفسه — نعرض أقدم ذكرى مضى عليها شهر
  const monthAgo = Date.now() - 30 * 86400000
  const oldPhoto = [...photos]
    .filter((p) => new Date(p.date).getTime() < monthAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
  if (oldPhoto) {
    return { kind: 'photo', photo: oldPhoto, label: formatDate(oldPhoto.date) }
  }
  return null
}
