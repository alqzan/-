import { useMemo, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Segmented } from '../../components/ui'
import { BookOpenIcon } from '../../components/icons'
import { useAppData } from '../../data/dataService'
import { formatDate, parentLabel } from '../../lib/format'
import { getPregnancyProgress } from '../../lib/pregnancy'

type Scope = 'favorites' | 'all'

/**
 * كتاب الذكريات: كل ما جُمع في صفحة واحدة مرتّبة زمنيًا،
 * مصمّمة لتُطبع أو تُحفظ PDF من نافذة الطباعة في المتصفح.
 */
export default function MemoryBook() {
  const data = useAppData()
  const [scope, setScope] = useState<Scope>('favorites')

  const favorites = data.photos.filter((p) => p.favorite)
  const photos = useMemo(() => {
    const list = scope === 'favorites' && favorites.length ? favorites : data.photos
    return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data.photos, favorites, scope])

  const journal = [...data.journal].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  const milestones = data.milestones
    .filter((m) => m.achievedAt)
    .sort((a, b) => new Date(a.achievedAt!).getTime() - new Date(b.achievedAt!).getTime())
  const openedCapsules = data.capsules.filter((c) => c.isOpened)

  const progress = getPregnancyProgress(data.child.lmpDate, data.child.dueDate)
  const isEmpty =
    photos.length === 0 &&
    journal.length === 0 &&
    milestones.length === 0 &&
    openedCapsules.length === 0

  return (
    <>
      <div className="print:hidden">
        <ScreenHeader title="كتاب الذكريات" subtitle="جاهز للطباعة أو الحفظ PDF" back />

        <Card className="mb-4">
          <p className="text-sm text-sage-600 leading-relaxed mb-3">
            هذه صفحة واحدة تجمع رحلتكم. اضغطوا «اطبع» ثم اختاروا
            <span className="font-bold"> حفظ كـ PDF </span>
            من نافذة الطباعة للاحتفاظ بنسخة أو إهدائها للعائلة.
          </p>
          {favorites.length > 0 && (
            <div className="mb-3">
              <Segmented
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'favorites', label: `المفضلة (${favorites.length})` },
                  { value: 'all', label: `كل الصور (${data.photos.length})` },
                ]}
              />
            </div>
          )}
          <Button className="w-full py-3" onClick={() => window.print()}>
            <BookOpenIcon className="w-5 h-5" /> اطبع الكتاب
          </Button>
        </Card>
      </div>

      {/* ===== محتوى الكتاب ===== */}
      <article className="memory-book">
        <header className="text-center py-6 border-b border-cream-300 mb-6">
          <div className="text-5xl mb-2">💛</div>
          <h1 className="text-2xl font-extrabold text-sage-800">
            {data.child.name || 'طفلنا'}
          </h1>
          <p className="text-sage-500 mt-1">
            من {data.child.parents.momName || 'ماما'} و{data.child.parents.dadName || 'بابا'}
          </p>
          <p className="text-sm text-sage-400 mt-2">
            {data.child.bornAt
              ? `وصل في ${formatDate(data.child.bornAt)}`
              : data.child.dueDate
                ? `في انتظاره — الموعد ${formatDate(data.child.dueDate)}`
                : 'رحلتنا معًا'}
            {progress && !data.child.bornAt ? ` • الأسبوع ${progress.week}` : ''}
          </p>
        </header>

        {isEmpty && (
          <p className="text-center text-sage-400 py-10">
            الكتاب فارغ حتى الآن — أضيفوا صورًا ورسائل وستظهر هنا تلقائيًا.
          </p>
        )}

        {journal.length > 0 && (
          <section className="mb-8">
            <h2 className="book-title">الرسائل</h2>
            <div className="space-y-4">
              {journal.map((j) => (
                <div key={j.id} className="break-inside-avoid">
                  {j.title && <div className="font-bold text-sage-800">{j.title}</div>}
                  <div className="text-xs text-sage-400 mb-1">
                    {parentLabel(j.author)} • {formatDate(j.date)}
                  </div>
                  <p className="text-sage-700 leading-relaxed whitespace-pre-wrap">{j.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {photos.length > 0 && (
          <section className="mb-8">
            <h2 className="book-title">الصور</h2>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p) => (
                <figure key={p.id} className="break-inside-avoid">
                  <img src={p.dataUrl} alt={p.caption ?? 'ذكرى'} className="w-full rounded-xl" />
                  <figcaption className="text-xs text-sage-500 mt-1">
                    {p.caption ? `${p.caption} — ` : ''}
                    {formatDate(p.date)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {milestones.length > 0 && (
          <section className="mb-8">
            <h2 className="book-title">المعالم</h2>
            <ul className="space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-start gap-3 break-inside-avoid">
                  <span className="text-2xl">{m.emoji}</span>
                  <div>
                    <div className="font-medium text-sage-800">{m.title}</div>
                    <div className="text-xs text-sage-400">{formatDate(m.achievedAt!)}</div>
                    {m.note && <p className="text-sm text-sage-600 mt-0.5">{m.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {openedCapsules.length > 0 && (
          <section className="mb-8">
            <h2 className="book-title">رسائل الكبسولة الزمنية</h2>
            <div className="space-y-4">
              {openedCapsules.map((c) => (
                <div key={c.id} className="break-inside-avoid">
                  <div className="font-bold text-sage-800">{c.title}</div>
                  <div className="text-xs text-sage-400 mb-1">
                    {parentLabel(c.author)} • فُتحت في {formatDate(c.openAt)}
                  </div>
                  <p className="text-sage-700 leading-relaxed whitespace-pre-wrap">{c.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-sage-400 border-t border-cream-300 pt-4 mt-8">
          صُنع بحبّ في تطبيق «طفلنا» 💛
        </footer>
      </article>
    </>
  )
}
