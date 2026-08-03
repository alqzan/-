import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Card, ProgressBar, cx } from '../../components/ui'
import { ChevronLeftIcon } from '../../components/icons'
import { useAppData } from '../../data/dataService'
import { getPregnancyProgress } from '../../lib/pregnancy'
import { getFetalWeek } from '../../lib/fetalData'

export default function DevelopmentScreen() {
  const data = useAppData()
  const p = getPregnancyProgress(data.child.lmpDate, data.child.dueDate)
  const currentWeek = p?.week ?? 12
  const [week, setWeek] = useState(Math.min(40, Math.max(4, currentWeek)))
  const fetal = getFetalWeek(week)

  return (
    <>
      <ScreenHeader title="تطوّر الجنين" subtitle={`الأسبوع ${week}`} back />

      {/* منتقي الأسبوع */}
      <Card className="!p-3 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeek((w) => Math.min(40, w + 1))}
            disabled={week >= 40}
            className="w-9 h-9 grid place-items-center rounded-full bg-sage-100 text-sage-600 disabled:opacity-40"
            aria-label="الأسبوع التالي"
          >
            <ChevronLeftIcon className="w-5 h-5 rotate-180" />
          </button>
          <div className="text-center">
            <div className="text-2xl font-extrabold text-sage-800">أسبوع {week}</div>
            {week === currentWeek && <div className="text-xs text-peach-500">أسبوعكم الحالي</div>}
          </div>
          <button
            onClick={() => setWeek((w) => Math.max(4, w - 1))}
            disabled={week <= 4}
            className="w-9 h-9 grid place-items-center rounded-full bg-sage-100 text-sage-600 disabled:opacity-40"
            aria-label="الأسبوع السابق"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>
      </Card>

      {/* بطاقة الجنين */}
      <Card className="text-center bg-gradient-to-b from-cream-50 to-peach-100">
        <div className="text-7xl mb-2">{fetal.emoji}</div>
        <div className="text-lg font-bold text-sage-800">بحجم {fetal.fruit}</div>
        <div className="flex justify-center gap-6 mt-4">
          <div>
            <div className="text-xl font-bold text-sage-700">{fetal.lengthCm} سم</div>
            <div className="text-xs text-sage-400">الطول</div>
          </div>
          <div className="w-px bg-cream-300" />
          <div>
            <div className="text-xl font-bold text-sage-700">
              {fetal.weightG >= 1000 ? `${(fetal.weightG / 1000).toFixed(1)} كجم` : `${fetal.weightG} جم`}
            </div>
            <div className="text-xs text-sage-400">الوزن</div>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="text-sage-700 leading-relaxed">{fetal.note}</p>
      </Card>

      {/* شريط الرحلة */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-sage-400 mb-2">
          <span>الأسبوع 4</span>
          <span>الأسبوع 40</span>
        </div>
        <ProgressBar value={(week - 4) / 36} />
      </div>

      <p className="text-xs text-sage-300 text-center mt-6 px-4">
        المعلومات تقريبية للاطّلاع العام وليست بديلًا عن استشارة الطبيب.
      </p>

      {/* مصغّرات سريعة لبعض الأسابيع */}
      <h2 className="section-title mt-6 mb-3">تنقّل سريع</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {[8, 12, 16, 20, 24, 28, 32, 36, 40].map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={cx(
              'shrink-0 w-16 h-16 rounded-2xl grid place-items-center text-2xl transition',
              week === w ? 'bg-sage-400 shadow-soft' : 'bg-white shadow-card',
            )}
          >
            {getFetalWeek(w).emoji}
          </button>
        ))}
      </div>
    </>
  )
}
