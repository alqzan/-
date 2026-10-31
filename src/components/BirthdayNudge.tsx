import { Card } from './ui'
import { useCapture } from './Capture'
import { useAppData } from '../data/dataService'
import { nextBirthday } from '../lib/birthday'
import { pluralAr } from '../lib/format'

const ORDINALS = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر']

/**
 * قبل عيد الميلاد بأسبوعين: اقتراح لكتابة رسالة السنة. عرض فقط؛ لا يُحفظ شيء
 * إلا إذا كتب الوالدان الرسالة وحفظاها بأنفسهما.
 */
export default function BirthdayNudge() {
  const data = useAppData()
  const { open } = useCapture()
  const info = nextBirthday(data.child.bornAt)
  if (!info || info.daysLeft > 14) return null

  const name = data.child.name || 'صغيركم'
  const ordinal = ORDINALS[info.turning] ?? `${info.turning}`
  const when =
    info.daysLeft === 0
      ? 'عيد ميلاده اليوم!'
      : `عيد ميلاده بعد ${pluralAr(info.daysLeft, 'يوم', 'يومين', 'أيام', 'يومًا')}`

  return (
    <Card
      onClick={() => open('letter', { title: `رسالة في عيد ميلاده ${ordinal}` })}
      className="mt-4 !bg-clay-50 !border-clay-100"
    >
      <div className="font-display font-bold text-ink-900">
        {name} — {when}
      </div>
      <p className="text-[13px] text-ink-500 mt-1 leading-relaxed">
        اكتبوا له رسالة العام {info.turning === 1 ? 'الأول' : `الـ${info.turning}`}: وش تغيّر فيه، وش تتمنون له.
        تدخل كتابه في موضعها.
      </p>
    </Card>
  )
}
