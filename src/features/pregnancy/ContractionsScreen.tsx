import { useEffect, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Card, EmptyState } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { PulseIcon } from '../../components/icons'
import { addContraction, clearContractions, useAppData } from '../../data/dataService'
import { formatDuration, formatTime } from '../../lib/format'

// الانقباضة الجارية تُحفظ حتى لا تضيع لو أُغلقت الشاشة أو الجوال أثناء المخاض
const ACTIVE_KEY = 'tafalna:active-contraction'

function loadActive(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    const value = raw ? Number(raw) : NaN
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export default function ContractionsScreen() {
  const data = useAppData()
  const [startedAt, setStartedAt] = useState<number | null>(loadActive)
  const [, tick] = useState(0)
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    if (startedAt == null) return
    const t = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(t)
  }, [startedAt])

  useEffect(() => {
    try {
      if (startedAt == null) localStorage.removeItem(ACTIVE_KEY)
      else localStorage.setItem(ACTIVE_KEY, String(startedAt))
    } catch {
      // شريط حالة الحفظ العام يغطّي أخطاء التخزين
    }
  }, [startedAt])

  const running = startedAt != null
  const elapsed = running ? Math.floor((Date.now() - startedAt) / 1000) : 0

  function toggle() {
    if (running && startedAt != null) {
      const dur = Math.round((Date.now() - startedAt) / 1000)
      addContraction(new Date(startedAt).toISOString(), dur)
      setStartedAt(null)
    } else {
      setStartedAt(Date.now())
    }
  }

  // ترتيب زمني تصاعدي لحساب الفواصل
  const sorted = [...data.contractions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  )
  const withGaps = sorted.map((c, i) => {
    const prev = sorted[i - 1]
    const gapMin = prev
      ? Math.round((new Date(c.startedAt).getTime() - new Date(prev.startedAt).getTime()) / 60000)
      : null
    return { ...c, gapMin }
  })

  const recent = withGaps.slice(-6).reverse()
  const avgDur = sorted.length
    ? Math.round(sorted.reduce((s, c) => s + c.durationSec, 0) / sorted.length)
    : 0
  const gaps = withGaps.map((c) => c.gapMin).filter((g): g is number => g != null)
  const avgGap = gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : 0

  return (
    <>
      <ScreenHeader title="عدّاد الانقباضات" subtitle="سجّلوا التوقيت والفاصل" back />

      <Card className="text-center">
        <div className={`text-6xl font-extrabold tabular-nums ${running ? 'text-peach-500' : 'text-sage-300'}`}>
          {formatDuration(elapsed)}
        </div>
        <p className="text-sage-400 text-sm mt-1 mb-4">
          {running ? 'الانقباضة جارية… اضغط عند انتهائها' : 'اضغط عند بداية الانقباضة'}
        </p>
        <button
          onClick={toggle}
          className={`btn w-full py-5 rounded-3xl text-lg font-bold shadow-soft active:scale-95 text-white ${
            running ? 'bg-blush-300 hover:bg-blush-300' : 'bg-peach-400 hover:bg-peach-500'
          }`}
        >
          {running ? 'انتهت الانقباضة' : 'بدأت الانقباضة'}
        </button>
      </Card>

      {sorted.length > 0 && (
        <div className="flex gap-3 mt-4">
          <div className="card flex-1 text-center !p-3">
            <div className="text-2xl font-bold text-sage-800">{formatDuration(avgDur)}</div>
            <div className="text-xs text-sage-400">متوسط المدة</div>
          </div>
          <div className="card flex-1 text-center !p-3">
            <div className="text-2xl font-bold text-sage-800">{avgGap || '—'} د</div>
            <div className="text-xs text-sage-400">متوسط الفاصل</div>
          </div>
        </div>
      )}

      <Card className="mt-4 bg-sky-100 !text-sky-300 border border-sky-200">
        <p className="text-sm text-sage-600 leading-relaxed">
          <span className="font-bold">تذكير:</span> إذا صارت الانقباضات كل ٥ دقائق، وتستمر
          دقيقة تقريبًا، ولمدة ساعة — تواصلي مع طبيبتك. (قاعدة ٥-١-١ التقريبية)
        </p>
      </Card>

      <div className="flex items-center justify-between mt-6 mb-3">
        <h2 className="section-title mb-0">آخر الانقباضات</h2>
        {sorted.length > 0 && (
          <button
            onClick={() =>
              confirm({
                title: 'مسح كل الانقباضات؟',
                message: 'سيُحذف السجل كاملًا ولا يمكن استرجاعه.',
                confirmLabel: 'مسح الكل',
                onConfirm: clearContractions,
              })
            }
            className="text-sm text-sage-400"
          >
            مسح الكل
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <EmptyState icon={<PulseIcon className="w-8 h-8" />} title="لا توجد انقباضات مسجّلة" />
      ) : (
        <div className="space-y-2">
          {recent.map((c) => (
            <Card key={c.id} className="!p-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blush-100 text-blush-300 grid place-items-center shrink-0">
                <PulseIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sage-800">مدّة {formatDuration(c.durationSec)}</div>
                <div className="text-xs text-sage-400">{formatTime(c.startedAt)}</div>
              </div>
              {c.gapMin != null && (
                <div className="text-sm text-sage-500">بعد {c.gapMin} د</div>
              )}
            </Card>
          ))}
        </div>
      )}

      {dialog}
    </>
  )
}
