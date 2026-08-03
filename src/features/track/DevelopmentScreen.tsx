import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Card, ProgressBar, cx } from '../../components/ui'
import { ChevronLeftIcon } from '../../components/icons'
import { FetalFigure } from '../../components/illustrations'
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
      <ScreenHeader title="تطوّر الجنين" subtitle={`الأسبوع ${week} من 40`} />

      {/* منتقي الأسبوع */}
      <Card className="!p-2.5 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeek((w) => Math.max(4, w - 1))}
            disabled={week <= 4}
            className="w-9 h-9 grid place-items-center rounded-full bg-paper-200 text-ink-600 disabled:opacity-30"
            aria-label="الأسبوع السابق"
          >
            <ChevronLeftIcon className="w-5 h-5 rotate-180" />
          </button>
          <div className="text-center">
            <div className="font-display font-bold text-[22px] text-ink-900 tnum">أسبوع {week}</div>
            {week === currentWeek && <div className="text-[11px] text-clay-500 mt-0.5">أسبوعكم الحالي</div>}
          </div>
          <button
            onClick={() => setWeek((w) => Math.min(40, w + 1))}
            disabled={week >= 40}
            className="w-9 h-9 grid place-items-center rounded-full bg-paper-200 text-ink-600 disabled:opacity-30"
            aria-label="الأسبوع التالي"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>
      </Card>

      {/* بطاقة الجنين — الرسمة تكبر فعلًا مع الأسابيع */}
      <Card className="text-center !py-7">
        <FetalFigure week={week} className="w-32 h-32 mx-auto text-clay-500" />
        <div className="font-display font-bold text-[19px] text-ink-900 mt-2">
          بحجم {fetal.fruit}
        </div>
        <div className="flex justify-center items-stretch gap-6 mt-5">
          <div>
            <div className="font-display font-bold text-[20px] text-ink-900 tnum">{fetal.lengthCm} سم</div>
            <div className="text-[11px] text-ink-400 mt-1">الطول</div>
          </div>
          <div className="w-px bg-line" />
          <div>
            <div className="font-display font-bold text-[20px] text-ink-900 tnum">
              {fetal.weightG >= 1000 ? `${(fetal.weightG / 1000).toFixed(1)} كجم` : `${fetal.weightG} جم`}
            </div>
            <div className="text-[11px] text-ink-400 mt-1">الوزن</div>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="prose-note">{fetal.note}</p>
      </Card>

      {/* شريط الرحلة */}
      <div className="mt-7">
        <div className="flex justify-between text-[11px] text-ink-400 mb-2 tnum">
          <span>الأسبوع 4</span>
          <span>الأسبوع 40</span>
        </div>
        <ProgressBar value={(week - 4) / 36} />
      </div>

      {/* تنقّل سريع بين محطات الرحلة */}
      <div className="eyebrow mt-7 mb-2.5">محطّات</div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
        {[8, 12, 16, 20, 24, 28, 32, 36, 40].map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={cx(
              'shrink-0 w-16 h-16 rounded-2xl grid place-items-center transition duration-200 border',
              week === w
                ? 'bg-ink-900 text-paper-50 border-ink-900'
                : 'bg-white text-ink-500 border-line',
            )}
          >
            <span className="text-center leading-none">
              <span className="block font-display font-bold text-[17px] tnum">{w}</span>
              <span className="block text-[10px] opacity-70 mt-1">أسبوع</span>
            </span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-ink-300 text-center mt-7 px-4 leading-relaxed">
        المعلومات تقريبية للاطّلاع العام وليست بديلًا عن استشارة الطبيب.
      </p>
    </>
  )
}
