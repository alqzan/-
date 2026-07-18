import { useNavigate } from 'react-router-dom'
import { Card, ProgressRing, cx } from '../../components/ui'
import {
  BookIcon,
  CalendarIcon,
  CameraIcon,
  FootIcon,
  MoonIcon,
  SparkleIcon,
} from '../../components/icons'
import { useAppData } from '../../data/dataService'
import { getPregnancyProgress, trimesterLabel } from '../../lib/pregnancy'
import { getFetalWeek } from '../../lib/fetalData'
import { formatDate, formatTime, parentLabel } from '../../lib/format'

export default function Home() {
  const data = useAppData()
  const navigate = useNavigate()
  const born = !!data.child.bornAt

  const nextAppt = [...data.appointments]
    .filter((a) => new Date(a.dateTime).getTime() >= Date.now())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0]

  const lastJournal = [...data.journal].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0]

  return (
    <>
      {/* ترويسة */}
      <header className="pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="text-sage-400 text-sm">أهلًا بكم في</div>
          <h1 className="text-2xl font-extrabold text-sage-800">طفلنا 👶</h1>
        </div>
        <div className="chip !bg-sage-100 !text-sage-500 text-xs">
          👩‍❤️‍👨 مشترك بينكما
        </div>
      </header>

      {born ? <NewbornCard /> : <PregnancyCard />}

      {/* إجراءات سريعة */}
      <h2 className="section-title mt-6 mb-3">إجراءات سريعة</h2>
      <div className="grid grid-cols-4 gap-2.5">
        <QuickAction icon={<FootIcon className="w-6 h-6" />} label="ركلة" tone="peach" onClick={() => navigate('/pregnancy/kicks')} />
        <QuickAction icon={<CameraIcon className="w-6 h-6" />} label="ذكرى" tone="blush" onClick={() => navigate('/memories')} />
        <QuickAction icon={<BookIcon className="w-6 h-6" />} label="رسالة" tone="sky" onClick={() => navigate('/memories/journal')} />
        <QuickAction icon={<CalendarIcon className="w-6 h-6" />} label="موعد" tone="sage" onClick={() => navigate('/pregnancy/appointments')} />
      </div>

      {/* الموعد القادم */}
      {nextAppt && (
        <>
          <h2 className="section-title mt-6 mb-3">الموعد القادم</h2>
          <Card onClick={() => navigate('/pregnancy/appointments')} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 grid place-items-center shrink-0">
              <CalendarIcon className="w-6 h-6 text-sky-300" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sage-800">{nextAppt.title}</div>
              <div className="text-sm text-sage-500">
                {formatDate(nextAppt.dateTime)} • {formatTime(nextAppt.dateTime)}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* آخر رسالة */}
      {lastJournal && (
        <>
          <h2 className="section-title mt-6 mb-3">آخر رسالة</h2>
          <Card onClick={() => navigate('/memories/journal')} className="bg-gradient-to-bl from-blush-100 to-peach-100">
            {lastJournal.title && <div className="font-bold text-sage-800 mb-1">{lastJournal.title}</div>}
            <p className="text-sage-700 leading-relaxed line-clamp-3">{lastJournal.text}</p>
            <div className="text-xs text-sage-400 mt-2">
              {parentLabel(lastJournal.author)} • {formatDate(lastJournal.date)}
            </div>
          </Card>
        </>
      )}

      {/* رعاية المولود (قريبًا) */}
      {!born && (
        <Card
          onClick={() => navigate('/baby-care')}
          className="mt-6 flex items-center gap-3 border border-dashed border-sage-200 bg-sage-50"
        >
          <div className="w-11 h-11 rounded-full bg-white grid place-items-center text-sage-400 shrink-0">
            <MoonIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sage-700">رعاية المولود</div>
            <div className="text-xs text-sage-400">رضاعة، حفاضات، نوم، نمو — تُفعّل بعد الولادة</div>
          </div>
          <span className="chip !text-xs">قريبًا</span>
        </Card>
      )}
    </>
  )
}

function PregnancyCard() {
  const data = useAppData()
  const navigate = useNavigate()
  const p = getPregnancyProgress(data.child.lmpDate, data.child.dueDate)
  if (!p) return null
  const fetal = getFetalWeek(p.week)

  return (
    <Card
      onClick={() => navigate('/pregnancy')}
      className="bg-gradient-to-bl from-sage-400 to-sage-500 !text-white"
    >
      <div className="flex items-center gap-4">
        <ProgressRing value={p.progress} size={112} stroke={10}>
          <div className="text-center leading-none">
            <div className="text-3xl font-extrabold">{p.week}</div>
            <div className="text-[11px] opacity-90 mt-0.5">أسبوع</div>
          </div>
        </ProgressRing>
        <div className="flex-1">
          <div className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5 text-xs mb-2">
            <SparkleIcon className="w-3.5 h-3.5" /> {trimesterLabel(p.trimester)}
          </div>
          <div className="text-4xl mb-1">{fetal.emoji}</div>
          <p className="text-sm opacity-95">بحجم {fetal.fruit} تقريبًا</p>
          <p className="text-xs opacity-80 mt-1">
            باقٍ {Math.max(0, p.daysLeft)} يوم • موعد اللقاء {data.child.dueDate ? formatDate(data.child.dueDate) : ''}
          </p>
        </div>
      </div>
    </Card>
  )
}

function NewbornCard() {
  const data = useAppData()
  const bornAt = data.child.bornAt!
  const days = Math.floor((Date.now() - new Date(bornAt).getTime()) / 86400000)
  return (
    <Card className="bg-gradient-to-bl from-peach-400 to-peach-500 !text-white text-center">
      <div className="text-5xl mb-2">🍼</div>
      <div className="text-xl font-bold">أهلًا يا {data.child.name}!</div>
      <p className="text-sm opacity-90 mt-1">عمره {days} يوم • وصل في {formatDate(bornAt)}</p>
    </Card>
  )
}

function QuickAction({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  tone: 'sage' | 'peach' | 'blush' | 'sky'
  onClick: () => void
}) {
  const tones = {
    sage: 'bg-sage-50 text-sage-500',
    peach: 'bg-peach-100 text-peach-500',
    blush: 'bg-blush-100 text-blush-300',
    sky: 'bg-sky-100 text-sky-300',
  }
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span className={cx('w-14 h-14 rounded-2xl grid place-items-center shadow-card', tones[tone])}>{icon}</span>
      <span className="text-xs text-sage-600">{label}</span>
    </button>
  )
}
