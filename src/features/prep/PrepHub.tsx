import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/Header'
import { ProgressBar, cx } from '../../components/ui'
import { BagIcon, HeartIcon, StarIcon } from '../../components/icons'
import { useAppData } from '../../data/dataService'

export default function PrepHub() {
  const data = useAppData()
  const navigate = useNavigate()

  const hospital = data.checklist.filter((c) => c.list === 'hospital')
  const shopping = data.checklist.filter((c) => c.list === 'shopping')
  const hospitalDone = hospital.filter((c) => c.done).length
  const shoppingDone = shopping.filter((c) => c.done).length
  const topName = [...data.names].sort(
    (a, b) => votes(b) - votes(a),
  )[0]

  return (
    <>
      <ScreenHeader title="التجهيزات" subtitle="نجهّز لاستقباله بحب" />

      {/* الأسماء */}
      <button
        onClick={() => navigate('/prep/names')}
        className="card w-full text-start active:scale-[0.99] transition mb-3 bg-gradient-to-bl from-blush-100 to-peach-100"
      >
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/70 grid place-items-center text-blush-300">
            <HeartIcon className="w-7 h-7" />
          </span>
          <div className="flex-1">
            <div className="font-bold text-sage-800">قائمة الأسماء</div>
            <div className="text-sm text-sage-500">
              {data.names.length} اسم مقترح
              {topName && ` • المتصدّر: ${topName.name}`}
            </div>
          </div>
          <StarIcon className="w-6 h-6 text-peach-400" />
        </div>
      </button>

      {/* قوائم */}
      <ChecklistLink
        title="شنطة المستشفى"
        done={hospitalDone}
        total={hospital.length}
        icon={<BagIcon className="w-7 h-7" />}
        tone="sage"
        onClick={() => navigate('/prep/hospital')}
      />
      <ChecklistLink
        title="مشتريات المولود"
        done={shoppingDone}
        total={shopping.length}
        icon={<StarIcon className="w-7 h-7" />}
        tone="sky"
        onClick={() => navigate('/prep/shopping')}
      />
    </>
  )
}

function votes(n: { votes: { mom: boolean; dad: boolean } }) {
  return (n.votes.mom ? 1 : 0) + (n.votes.dad ? 1 : 0)
}

function ChecklistLink({
  title,
  done,
  total,
  icon,
  tone,
  onClick,
}: {
  title: string
  done: number
  total: number
  icon: React.ReactNode
  tone: 'sage' | 'sky'
  onClick: () => void
}) {
  const tones = {
    sage: 'bg-sage-50 text-sage-500',
    sky: 'bg-sky-100 text-sky-300',
  }
  return (
    <button onClick={onClick} className="card w-full text-start active:scale-[0.99] transition mb-3">
      <div className="flex items-center gap-3 mb-3">
        <span className={cx('w-12 h-12 rounded-2xl grid place-items-center', tones[tone])}>{icon}</span>
        <div className="flex-1">
          <div className="font-bold text-sage-800">{title}</div>
          <div className="text-sm text-sage-500">
            {done} من {total} جاهز
          </div>
        </div>
        <span className="text-lg font-bold text-sage-700">
          {total ? Math.round((done / total) * 100) : 0}%
        </span>
      </div>
      <ProgressBar value={total ? done / total : 0} />
    </button>
  )
}
