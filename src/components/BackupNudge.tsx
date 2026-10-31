import { useNavigate } from 'react-router-dom'
import { Card } from './ui'
import { ArchiveIcon } from './icons'
import { useAppData } from '../data/dataService'
import { daysSinceBackup } from '../lib/backup'
import { pluralAr } from '../lib/format'

/**
 * تذكير بالنسخة الاحتياطية — البيانات محفوظة على هذا الجهاز فقط.
 * يظهر في المتابعة (الشاشة الرئيسية الفعلية) حين يوجد محتوى ولم تؤخذ نسخة
 * منذ أكثر من ٣٠ يومًا. عرض فقط، لا يمسّ البيانات ولا النسخ.
 */
export default function BackupNudge() {
  const data = useAppData()
  const navigate = useNavigate()
  const hasContent =
    data.photos.length + data.journal.length + data.voices.length + data.capsules.length > 0 ||
    data.milestones.some((m) => m.achievedAt)
  const since = daysSinceBackup()
  if (!hasContent || (since !== null && since <= 30)) return null

  return (
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
          {since === null
            ? 'ما أُخذت نسخة احتياطية بعد — كل شيء محفوظ على هذا الجهاز فقط.'
            : `آخر نسخة قبل ${pluralAr(since, 'يوم', 'يومين', 'أيام', 'يومًا')}.`}
        </span>
      </span>
    </Card>
  )
}
