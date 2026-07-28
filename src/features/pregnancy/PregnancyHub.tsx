import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/Header'
import { Card, ProgressRing, cx } from '../../components/ui'
import {
  CalendarIcon,
  FootIcon,
  HeartIcon,
  PulseIcon,
  SparkleIcon,
} from '../../components/icons'
import { useAppData } from '../../data/dataService'
import { getPregnancyProgress, trimesterLabel } from '../../lib/pregnancy'
import { getFetalWeek } from '../../lib/fetalData'

export default function PregnancyHub() {
  const data = useAppData()
  const navigate = useNavigate()
  const p = getPregnancyProgress(data.child.lmpDate, data.child.dueDate)

  if (!p) {
    return (
      <>
        <ScreenHeader title="الحمل" />
        <Card>لم يتم تحديد تاريخ الحمل بعد.</Card>
      </>
    )
  }

  const fetal = getFetalWeek(p.week)

  const tools = [
    { to: '/pregnancy/development', label: 'تطوّر الجنين', Icon: SparkleIcon, tone: 'sage', desc: `أسبوع ${p.week}` },
    { to: '/pregnancy/kicks', label: 'عدّاد الركلات', Icon: FootIcon, tone: 'peach', desc: `${data.kicks.length} جلسة` },
    { to: '/pregnancy/contractions', label: 'الانقباضات', Icon: PulseIcon, tone: 'blush', desc: 'مؤقّت' },
    { to: '/pregnancy/appointments', label: 'المواعيد', Icon: CalendarIcon, tone: 'sky', desc: `${data.appointments.length} موعد` },
    { to: '/pregnancy/mom', label: 'متابعة الأم', Icon: HeartIcon, tone: 'sage', desc: `${data.momLogs.length} تدوينة` },
  ] as const

  return (
    <>
      <ScreenHeader title="رحلة الحمل" subtitle={trimesterLabel(p.trimester)} />

      {/* بطاقة الأسبوع */}
      <Card
        className="bg-gradient-to-bl from-sage-400 to-sage-500 !text-white overflow-hidden relative"
        onClick={() => navigate('/pregnancy/development')}
      >
        <div className="flex items-center gap-4">
          <ProgressRing value={p.progress} size={104} stroke={9}>
            <div className="text-center leading-none">
              <div className="text-3xl font-extrabold">{p.week}</div>
              <div className="text-[11px] opacity-90 mt-0.5">أسبوع</div>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <div className="text-5xl mb-1">{fetal.emoji}</div>
            <p className="text-sm opacity-95">
              بحجم {fetal.fruit} تقريبًا
            </p>
            <p className="text-xs opacity-80 mt-1">
              باقٍ {Math.max(0, p.daysLeft)} يوم على اللقاء 💛
            </p>
          </div>
        </div>
      </Card>

      {/* الأدوات */}
      <h2 className="section-title mt-6 mb-3">أدوات المتابعة</h2>
      <div className="grid grid-cols-2 gap-3">
        {tools.map(({ to, label, Icon, tone, desc }) => {
          const tones: Record<string, string> = {
            sage: 'bg-sage-50 text-sage-500',
            peach: 'bg-peach-100 text-peach-500',
            blush: 'bg-blush-100 text-blush-300',
            sky: 'bg-sky-100 text-sky-300',
          }
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="card !p-4 text-start active:scale-[0.98] transition"
            >
              <span className={cx('grid place-items-center w-11 h-11 rounded-full mb-3', tones[tone])}>
                <Icon className="w-6 h-6" />
              </span>
              <div className="font-bold text-sage-800">{label}</div>
              <div className="text-xs text-sage-400 mt-0.5">{desc}</div>
            </button>
          )
        })}
      </div>
    </>
  )
}
