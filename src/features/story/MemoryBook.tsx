import { useMemo, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Segmented } from '../../components/ui'
import { LockIcon, MicIcon, PrintIcon, QuoteIcon, StarIcon } from '../../components/icons'
import VoicePlayer from '../../components/VoicePlayer'
import { formatClock } from '../../lib/audio'
import { EmbraceMark, Monogram } from '../../components/illustrations'
import { useAppData } from '../../data/dataService'
import { formatDate, parentLabel, pluralAr } from '../../lib/format'
import { photoSrc } from '../../lib/image'
import { getPregnancyProgress } from '../../lib/pregnancy'
import { ageInDays } from '../../lib/localDate'
import { stageLabel } from './timeline'
import type { Photo, VoiceNote } from '../../data/types'

type Scope = 'favorites' | 'all'

// ============================================================
// كتاب الذكريات.
//
// الفكرة: ليس تجميعة أقسام منفصلة، بل **حكاية واحدة مرتّبة زمنيًا**.
// الصورة التي التُقطت يوم أول ركلة تجاور الرسالة التي كُتبت في اليوم نفسه،
// لأن هكذا تُعاش الذكرى — لا مفصولةً في جدولين.
//
// مصمَّم ليُطبع: كل فصل يبدأ صفحة جديدة، ولا يُقطع عنصر عبر صفحتين.
// ============================================================

type Entry =
  | { kind: 'photo'; date: string; photo: Photo }
  | { kind: 'voice'; date: string; voice: VoiceNote }
  | { kind: 'journal'; date: string; title?: string; text: string; author: 'mom' | 'dad' }
  | { kind: 'milestone'; date: string; title: string; note?: string }
  | { kind: 'capsule'; date: string; title: string; message: string; author: 'mom' | 'dad' }

export default function MemoryBook() {
  const data = useAppData()
  const [scope, setScope] = useState<Scope>('all')

  const favorites = useMemo(() => data.photos.filter((p) => p.favorite), [data.photos])

  /** كل الذكريات في خيط زمني واحد */
  const timeline = useMemo<Entry[]>(() => {
    const photos = scope === 'favorites' && favorites.length ? favorites : data.photos
    const entries: Entry[] = [
      ...photos.map((p): Entry => ({ kind: 'photo', date: p.date, photo: p })),
      ...data.voices.map((v): Entry => ({ kind: 'voice', date: v.date, voice: v })),
      ...data.journal.map(
        (j): Entry => ({
          kind: 'journal',
          date: j.date,
          title: j.title,
          text: j.text,
          author: j.author,
        }),
      ),
      ...data.milestones
        .filter((m) => m.achievedAt)
        .map(
          (m): Entry => ({
            kind: 'milestone',
            date: m.achievedAt!,
            title: m.title,
            note: m.note,
          }),
        ),
      ...data.capsules
        .filter((c) => c.isOpened)
        .map(
          (c): Entry => ({
            kind: 'capsule',
            date: c.openAt,
            title: c.title,
            message: c.message,
            author: c.author,
          }),
        ),
    ]
    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data.photos, data.journal, data.voices, data.milestones, data.capsules, favorites, scope])

  /** تجميع الخيط الزمني حسب الشهر ليصير للكتاب فصول */
  const chapters = useMemo(() => {
    const byMonth = new Map<string, Entry[]>()
    for (const entry of timeline) {
      const d = new Date(entry.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(entry)
    }
    return [...byMonth.entries()].map(([key, entries]) => {
      const [year, month] = key.split('-').map(Number)
      return {
        key,
        label: new Date(`${key}-01T12:00:00`).toLocaleDateString('ar', {
          month: 'long',
          year: 'numeric',
        }),
        stage: stageLabel(data.child, new Date(year, month - 1, 15)),
        entries,
      }
    })
  }, [timeline, data.child])

  const progress = getPregnancyProgress(data.child.lmpDate, data.child.dueDate)
  const childName = data.child.name || 'طفلنا'
  const momName = data.child.parents.momName || 'أمه'
  const dadName = data.child.parents.dadName || 'أبوه'

  const stats = useMemo(
    () => [
      { value: data.photos.length, label: 'صورة' },
      { value: data.journal.length, label: 'رسالة' },
      { value: data.voices.length, label: 'تسجيلًا' },
      { value: data.milestones.filter((m) => m.achievedAt).length, label: 'معلمًا' },
      { value: data.capsules.length, label: 'كبسولة' },
    ],
    [data],
  )

  const isEmpty = timeline.length === 0

  return (
    <>
      {/* ===== أدوات الشاشة (لا تُطبع) ===== */}
      <div className="print:hidden">
        <ScreenHeader title="كتاب الذكريات" subtitle="جاهز للطباعة أو الحفظ PDF" />

        <Card className="mb-6">
          <p className="text-[13px] text-ink-600 leading-relaxed mb-4">
            رحلتكم كاملة في كتاب واحد مرتّب بالتاريخ. اضغطوا «اطبعوا الكتاب» ثم اختاروا
            <span className="font-bold"> حفظ كـ PDF </span>
            للاحتفاظ بنسخة أو إهدائها للعائلة.
          </p>
          {favorites.length > 0 && (
            <div className="mb-4">
              <Segmented
                label="الصور المضمّنة"
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'all', label: `كل الصور (${data.photos.length})` },
                  { value: 'favorites', label: `المفضلة (${favorites.length})` },
                ]}
              />
            </div>
          )}
          <Button className="w-full py-3" onClick={() => window.print()}>
            <PrintIcon className="w-5 h-5" /> اطبعوا الكتاب
          </Button>
        </Card>
      </div>

      {/* ===== الكتاب ===== */}
      <article className="memory-book">
        {/* --- الغلاف --- */}
        <header className="book-cover text-center">
          {data.child.photo ? (
            <img
              src={data.child.photo}
              alt={childName}
              className="w-28 h-28 rounded-full object-cover mx-auto mb-5 border border-line"
            />
          ) : (
            <Monogram name={childName} className="w-24 h-24 text-4xl mx-auto mb-5" />
          )}

          <p className="eyebrow">كتاب ذكريات</p>
          <h1 className="font-display font-bold text-[38px] text-ink-900 my-3 leading-tight">
            {childName}
          </h1>
          <EmbraceMark className="w-24 h-16 mx-auto text-clay-300" />
          <p className="text-ink-600 mt-3">
            بقلم {momName} و{dadName}
          </p>
          <p className="text-[13px] text-ink-400 mt-3 leading-relaxed">
            {data.child.bornAt ? (
              <>
                وصل إلى الدنيا في {formatDate(data.child.bornAt)}
                <br />
                {(() => {
                  const days = ageInDays(data.child.bornAt)
                  return `عمره اليوم ${pluralAr(days, 'يوم واحد', 'يومان', 'أيام', 'يومًا')}`
                })()}
              </>
            ) : data.child.dueDate ? (
              <>
                في انتظاره — الموعد {formatDate(data.child.dueDate)}
                {progress ? (
                  <>
                    <br />
                    {`الأسبوع ${progress.week} من الحمل`}
                  </>
                ) : null}
              </>
            ) : (
              'رحلتنا معًا'
            )}
          </p>

          {/* أرقام الرحلة */}
          {!isEmpty && (
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 mt-7 pt-6 border-t border-line">
              {stats
                .filter((s) => s.value > 0)
                .map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="font-display font-bold text-[22px] text-ink-900 leading-none tnum">
                      {s.value}
                    </div>
                    <div className="text-[11px] text-ink-400 mt-1.5">{s.label}</div>
                  </div>
                ))}
            </div>
          )}
        </header>

        {isEmpty && (
          <p className="text-center text-ink-400 py-12 leading-relaxed">
            الكتاب فارغ حتى الآن.
            <br />
            أضيفوا صورة أو اكتبوا رسالة، وبتظهر هنا تلقائيًا مرتّبة بالتاريخ.
          </p>
        )}

        {/* --- الفصول --- */}
        {chapters.map((chapter) => (
          <section key={chapter.key} className="book-chapter mb-10">
            <h2 className="book-chapter-title text-center mb-6">
              <span className="block font-display font-bold text-[20px] text-ink-900">
                {chapter.label}
              </span>
              {chapter.stage && (
                <span className="block text-[12px] text-ink-400 mt-1">{chapter.stage}</span>
              )}
              <span className="book-rule" />
            </h2>
            <div className="space-y-6">
              {chapter.entries.map((entry, i) => (
                <BookEntry key={`${chapter.key}-${i}`} entry={entry} />
              ))}
            </div>
          </section>
        ))}

        {/* --- الكبسولات التي لم تُفتح بعد --- */}
        {data.capsules.some((c) => !c.isOpened) && (
          <section className="book-chapter mb-10">
            <h2 className="book-chapter-title text-center mb-4">
              <span className="block font-display font-bold text-[20px] text-ink-900">
                رسائل تنتظر وقتها
              </span>
              <span className="book-rule" />
            </h2>
            <p className="text-[13px] text-ink-500 mb-4 leading-relaxed text-center">
              كتبناها لك، وتُفتح كل واحدة في موعدها.
            </p>
            <ul className="space-y-2.5">
              {data.capsules
                .filter((c) => !c.isOpened)
                .sort((a, b) => new Date(a.openAt).getTime() - new Date(b.openAt).getTime())
                .map((c) => (
                  <li
                    key={c.id}
                    className="book-entry flex items-center gap-3 bg-brass-50 border border-brass-100 rounded-2xl p-4"
                  >
                    <LockIcon className="w-5 h-5 text-brass-500 shrink-0" />
                    <div>
                      <div className="font-medium text-ink-900">{c.title}</div>
                      <div className="text-[12px] text-ink-400 mt-0.5">
                        من {parentLabel(c.author)} • تُفتح في {formatDate(c.openAt)}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <footer className="book-footer text-center">
          <div className="book-rule" />
          <p className="font-serif text-ink-600 leading-relaxed">
            كل صفحة هنا كُتبت بحبّ لـ{childName}.
          </p>
          <p className="text-[11px] text-ink-400 mt-2">
            من تطبيق «طفلنا» • {formatDate(new Date())}
          </p>
        </footer>
      </article>
    </>
  )
}

/** عنصر واحد في الخيط الزمني — لكل نوع شكله الخاص */
function BookEntry({ entry }: { entry: Entry }) {
  const day = formatDate(entry.date)

  if (entry.kind === 'photo') {
    return (
      <figure className="book-entry">
        <img
          src={photoSrc(entry.photo)}
          alt={entry.photo.caption ?? 'ذكرى'}
          className="w-full rounded-2xl border border-line"
        />
        <figcaption className="text-[13px] text-ink-600 mt-2.5 leading-relaxed text-center">
          {entry.photo.caption && <span className="block font-serif">{entry.photo.caption}</span>}
          <span className="text-[11px] text-ink-400">
            {day} • عدسة {parentLabel(entry.photo.author)}
          </span>
        </figcaption>
      </figure>
    )
  }

  if (entry.kind === 'voice') {
    return (
      <div className="book-entry bg-paper-100 border border-line rounded-2xl p-4">
        <div className="flex items-center gap-2 text-[11px] text-ink-400 mb-2">
          <MicIcon className="w-3.5 h-3.5" />
          <span>
            رسالة صوتية من {parentLabel(entry.voice.author)} • {day}
          </span>
        </div>
        {entry.voice.title && (
          <div className="font-display font-bold text-ink-900 mb-2">{entry.voice.title}</div>
        )}
        {/* على الورق لا يُشغَّل صوت: نطبع المدة ونُبقي المشغّل للشاشة فقط */}
        <div className="print:hidden">
          <VoicePlayer voice={entry.voice} />
        </div>
        <div className="hidden print:block text-[13px] text-ink-500">
          تسجيل مدّته {formatClock(entry.voice.durationSec)} — يُسمع داخل التطبيق.
        </div>
      </div>
    )
  }

  if (entry.kind === 'milestone') {
    return (
      <div className="book-entry flex items-start gap-3 border-s-2 border-clay-300 ps-4">
        <StarIcon className="w-5 h-5 text-clay-500 shrink-0 mt-1" />
        <div>
          <div className="font-display font-bold text-ink-900">{entry.title}</div>
          <div className="text-[11px] text-ink-400 mt-0.5">{day}</div>
          {entry.note && <p className="prose-note mt-1.5">{entry.note}</p>}
        </div>
      </div>
    )
  }

  if (entry.kind === 'capsule') {
    return (
      <blockquote className="book-entry bg-brass-50 border border-brass-100 rounded-2xl p-5">
        <div className="text-[11px] text-brass-600 mb-1.5">
          كبسولة من {parentLabel(entry.author)} • فُتحت في {day}
        </div>
        <div className="font-display font-bold text-ink-900 mb-1.5">{entry.title}</div>
        <p className="prose-note whitespace-pre-wrap">{entry.message}</p>
      </blockquote>
    )
  }

  return (
    <div className="book-entry bg-paper-100 border border-line rounded-2xl p-5">
      <QuoteIcon className="w-5 h-5 text-clay-200 mb-1" />
      {entry.title && <div className="font-display font-bold text-ink-900">{entry.title}</div>}
      <div className="text-[11px] text-ink-400 mb-2 mt-0.5">
        {parentLabel(entry.author)} • {day}
      </div>
      <p className="prose-note whitespace-pre-wrap">{entry.text}</p>
    </div>
  )
}
