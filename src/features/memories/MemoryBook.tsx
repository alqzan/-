import { useMemo, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Segmented } from '../../components/ui'
import { BookOpenIcon } from '../../components/icons'
import { useAppData } from '../../data/dataService'
import { formatDate, parentLabel, pluralAr } from '../../lib/format'
import { photoSrc } from '../../lib/image'
import { getPregnancyProgress } from '../../lib/pregnancy'
import { ageInDays } from '../../lib/localDate'
import type { Photo } from '../../data/types'

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
  | { kind: 'journal'; date: string; title?: string; text: string; author: 'mom' | 'dad' }
  | { kind: 'milestone'; date: string; title: string; emoji: string; note?: string }
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
            emoji: m.emoji,
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
  }, [data.photos, data.journal, data.milestones, data.capsules, favorites, scope])

  /** تجميع الخيط الزمني حسب الشهر ليصير للكتاب فصول */
  const chapters = useMemo(() => {
    const byMonth = new Map<string, Entry[]>()
    for (const entry of timeline) {
      const d = new Date(entry.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(entry)
    }
    return [...byMonth.entries()].map(([key, entries]) => ({
      key,
      label: new Date(`${key}-01T12:00:00`).toLocaleDateString('ar', {
        month: 'long',
        year: 'numeric',
      }),
      entries,
    }))
  }, [timeline])

  const progress = getPregnancyProgress(data.child.lmpDate, data.child.dueDate)
  const childName = data.child.name || 'طفلنا'
  const momName = data.child.parents.momName || 'ماما'
  const dadName = data.child.parents.dadName || 'بابا'

  const stats = useMemo(
    () => [
      { value: data.photos.length, label: 'صورة' },
      { value: data.journal.length, label: 'رسالة' },
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
        <ScreenHeader title="كتاب الذكريات" subtitle="جاهز للطباعة أو الحفظ PDF" back />

        <Card className="mb-4">
          <p className="text-sm text-sage-600 leading-relaxed mb-3">
            رحلتكم كاملة في كتاب واحد مرتّب بالتاريخ. اضغطوا «اطبع» ثم اختاروا
            <span className="font-bold"> حفظ كـ PDF </span>
            للاحتفاظ بنسخة أو إهدائها للعائلة.
          </p>
          {favorites.length > 0 && (
            <div className="mb-3">
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
            <BookOpenIcon className="w-5 h-5" /> اطبع الكتاب
          </Button>
        </Card>
      </div>

      {/* ===== الكتاب ===== */}
      <article className="memory-book">
        {/* --- الغلاف --- */}
        <header className="book-cover">
          {data.child.photo && (
            <img src={data.child.photo} alt={childName} className="book-cover-photo" />
          )}
          <div className="text-5xl mb-3">💛</div>
          <p className="text-sage-400 text-sm tracking-wide">كتاب ذكريات</p>
          <h1 className="text-4xl font-extrabold text-sage-800 my-2 leading-tight">
            {childName}
          </h1>
          <div className="book-rule" />
          <p className="text-sage-600">
            بقلم {momName} و{dadName}
          </p>
          <p className="text-sm text-sage-400 mt-3 leading-relaxed">
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
            <div className="book-stats">
              {stats
                .filter((s) => s.value > 0)
                .map((s) => (
                  <div key={s.label} className="book-stat">
                    <div className="book-stat-value">{s.value}</div>
                    <div className="book-stat-label">{s.label}</div>
                  </div>
                ))}
            </div>
          )}
        </header>

        {isEmpty && (
          <p className="text-center text-sage-400 py-12 leading-relaxed">
            الكتاب فارغ حتى الآن.
            <br />
            أضيفوا صورة أو اكتبوا رسالة، وستظهر هنا تلقائيًا مرتّبة بالتاريخ.
          </p>
        )}

        {/* --- الفصول --- */}
        {chapters.map((chapter) => (
          <section key={chapter.key} className="book-chapter">
            <h2 className="book-chapter-title">{chapter.label}</h2>
            <div className="space-y-5">
              {chapter.entries.map((entry, i) => (
                <BookEntry key={`${chapter.key}-${i}`} entry={entry} />
              ))}
            </div>
          </section>
        ))}

        {/* --- الكبسولات التي لم تُفتح بعد --- */}
        {data.capsules.some((c) => !c.isOpened) && (
          <section className="book-chapter">
            <h2 className="book-chapter-title">رسائل تنتظر وقتها</h2>
            <p className="text-sm text-sage-500 mb-3 leading-relaxed">
              كتبناها لك، وتُفتح في موعدها 💌
            </p>
            <ul className="space-y-2">
              {data.capsules
                .filter((c) => !c.isOpened)
                .sort((a, b) => new Date(a.openAt).getTime() - new Date(b.openAt).getTime())
                .map((c) => (
                  <li key={c.id} className="book-entry flex items-center gap-3">
                    <span className="text-xl shrink-0">🔒</span>
                    <div>
                      <div className="font-medium text-sage-800">{c.title}</div>
                      <div className="text-xs text-sage-400">
                        من {parentLabel(c.author)} • تُفتح في {formatDate(c.openAt)}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <footer className="book-footer">
          <div className="book-rule" />
          <p className="text-sage-500 leading-relaxed">
            كل صفحة هنا كُتبت بحبّ لـ{childName} 💛
          </p>
          <p className="text-xs text-sage-400 mt-1">
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
          className="w-full rounded-2xl"
        />
        <figcaption className="text-sm text-sage-600 mt-2 leading-relaxed">
          {entry.photo.caption && <span className="block">{entry.photo.caption}</span>}
          <span className="text-xs text-sage-400">
            {day} • عدسة {parentLabel(entry.photo.author)}
          </span>
        </figcaption>
      </figure>
    )
  }

  if (entry.kind === 'milestone') {
    return (
      <div className="book-entry book-milestone">
        <span className="text-3xl shrink-0">{entry.emoji}</span>
        <div>
          <div className="font-bold text-sage-800">{entry.title}</div>
          <div className="text-xs text-sage-400">{day}</div>
          {entry.note && (
            <p className="text-sage-700 leading-relaxed mt-1">{entry.note}</p>
          )}
        </div>
      </div>
    )
  }

  if (entry.kind === 'capsule') {
    return (
      <blockquote className="book-entry book-capsule">
        <div className="text-xs text-sage-400 mb-1">
          💌 كبسولة من {parentLabel(entry.author)} • فُتحت في {day}
        </div>
        <div className="font-bold text-sage-800 mb-1">{entry.title}</div>
        <p className="text-sage-700 leading-loose whitespace-pre-wrap">{entry.message}</p>
      </blockquote>
    )
  }

  return (
    <div className="book-entry book-letter">
      {entry.title && <div className="font-bold text-sage-800">{entry.title}</div>}
      <div className="text-xs text-sage-400 mb-1">
        {parentLabel(entry.author)} • {day}
      </div>
      <p className="text-sage-700 leading-loose whitespace-pre-wrap">{entry.text}</p>
    </div>
  )
}
