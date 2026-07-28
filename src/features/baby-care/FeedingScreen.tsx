import { useEffect, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, StatTile, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { BottleIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { addFeeding, deleteFeeding, useAppData } from '../../data/dataService'
import type { BreastSide, FeedingKind } from '../../data/types'
import { formatDuration, formatTime, relativeFromNow } from '../../lib/format'
import { isSameLocalDay } from '../../lib/localDate'

const ACTIVE_KEY = 'tafalna:active-feeding'

type Active = { startedAt: number; side: BreastSide }

function loadActive(): Active | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return raw ? (JSON.parse(raw) as Active) : null
  } catch {
    return null
  }
}

export default function FeedingScreen() {
  const data = useAppData()
  const [active, setActive] = useState<Active | null>(loadActive)
  const [bottleOpen, setBottleOpen] = useState(false)
  const [, tick] = useState(0)
  const { confirm, dialog } = useConfirm()

  // مؤقّت حيّ + استمرارية الجلسة لو أُغلقت الشاشة
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [active])

  useEffect(() => {
    try {
      if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
      else localStorage.removeItem(ACTIVE_KEY)
    } catch {
      // شريط حالة الحفظ العام يغطّي أخطاء التخزين
    }
  }, [active])

  const elapsed = active ? Math.floor((Date.now() - active.startedAt) / 1000) : 0

  const today = data.feedings.filter((f) => isSameLocalDay(f.startedAt))
  const todayMl = today
    .filter((f) => f.kind === 'bottle')
    .reduce((sum, f) => sum + (f.amountMl ?? 0), 0)
  const last = [...data.feedings].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )[0]

  function finishBreast() {
    if (!active) return
    const durationMin = Math.max(1, Math.round((Date.now() - active.startedAt) / 60000))
    addFeeding({
      startedAt: new Date(active.startedAt).toISOString(),
      kind: 'breast',
      side: active.side,
      durationMin,
    })
    setActive(null)
  }

  return (
    <>
      <ScreenHeader title="الرضاعة" subtitle="تتبّعوا رضعات اليوم" back />

      <div className="flex gap-3 mb-4">
        <StatTile label="رضعات اليوم" value={today.length} icon={<BottleIcon className="w-4 h-4" />} tone="peach" />
        <StatTile
          label="آخر رضعة"
          value={last ? relativeFromNow(last.startedAt) : '—'}
          sub={last ? formatTime(last.startedAt) : undefined}
        />
      </div>
      {todayMl > 0 && (
        <Card className="!p-3.5 mb-4 text-center">
          <span className="text-sage-500 text-sm">إجمالي الرضّاعة اليوم: </span>
          <span className="font-bold text-sage-800">{todayMl} مل</span>
        </Card>
      )}

      {active ? (
        <Card className="text-center bg-gradient-to-b from-cream-50 to-peach-100">
          <div className="text-sage-500 mb-1">
            رضاعة طبيعية — الجهة {active.side === 'left' ? 'اليسرى' : 'اليمنى'}
          </div>
          <div className="text-5xl font-extrabold text-sage-800 tabular-nums my-3">
            {formatDuration(elapsed)}
          </div>
          <Button variant="peach" className="w-full py-4" onClick={finishBreast}>
            إنهاء الرضعة وحفظها
          </Button>
          <Button variant="ghost" className="w-full mt-2" onClick={() => setActive(null)}>
            إلغاء بدون حفظ
          </Button>
        </Card>
      ) : (
        <Card>
          <div className="text-sage-600 text-sm mb-3">ابدؤوا رضاعة طبيعية</div>
          <div className="flex gap-3 mb-4">
            {(['right', 'left'] as BreastSide[]).map((side) => (
              <button
                key={side}
                onClick={() => setActive({ startedAt: Date.now(), side })}
                className="btn flex-1 py-4 bg-sage-400 text-white shadow-soft hover:bg-sage-500"
              >
                {side === 'right' ? 'اليمنى' : 'اليسرى'}
              </button>
            ))}
          </div>
          <Button variant="ghost" className="w-full py-3" onClick={() => setBottleOpen(true)}>
            <PlusIcon className="w-5 h-5" /> تسجيل رضعة رضّاعة
          </Button>
        </Card>
      )}

      <h2 className="section-title mt-6 mb-3">السجل</h2>
      {data.feedings.length === 0 ? (
        <EmptyState icon={<BottleIcon className="w-8 h-8" />} title="لا رضعات مسجّلة بعد" />
      ) : (
        <div className="space-y-2">
          {data.feedings.slice(0, 30).map((f) => (
            <Card key={f.id} className="!p-3.5 flex items-center gap-3">
              <div
                className={cx(
                  'w-11 h-11 rounded-full grid place-items-center shrink-0',
                  f.kind === 'breast' ? 'bg-sage-50 text-sage-500' : 'bg-peach-100 text-peach-500',
                )}
              >
                <BottleIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sage-800">
                  {f.kind === 'breast'
                    ? `طبيعية • ${f.side === 'left' ? 'اليسرى' : 'اليمنى'}`
                    : `رضّاعة • ${f.amountMl ?? 0} مل`}
                </div>
                <div className="text-xs text-sage-400">
                  {formatTime(f.startedAt)}
                  {f.durationMin ? ` • ${f.durationMin} دقيقة` : ''}
                </div>
              </div>
              <button
                onClick={() =>
                  confirm({
                    title: 'حذف هذه الرضعة؟',
                    onConfirm: () => deleteFeeding(f.id),
                    confirmLabel: 'حذف',
                  })
                }
                className="text-sage-300 hover:text-red-600 p-2"
                aria-label="حذف"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <BottleSheet open={bottleOpen} onClose={() => setBottleOpen(false)} />
      {dialog}
    </>
  )
}

function BottleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [minutes, setMinutes] = useState('')

  function submit() {
    const kind: FeedingKind = 'bottle'
    addFeeding({
      startedAt: new Date().toISOString(),
      kind,
      amountMl: amount ? Number(amount) : undefined,
      durationMin: minutes ? Number(minutes) : undefined,
    })
    setAmount('')
    setMinutes('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="رضعة رضّاعة">
      <div className="flex gap-3">
        <Field label="الكمية (مل)">
          <input
            type="number"
            inputMode="numeric"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="90"
          />
        </Field>
        <Field label="المدة (دقيقة)">
          <input
            type="number"
            inputMode="numeric"
            className="input"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="15"
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {[60, 90, 120, 150, 180].map((ml) => (
          <button
            key={ml}
            onClick={() => setAmount(String(ml))}
            className="chip !bg-cream-200 !text-sage-600"
          >
            {ml} مل
          </button>
        ))}
      </div>
      <Button variant="peach" className="w-full" onClick={submit}>
        حفظ الرضعة
      </Button>
    </Sheet>
  )
}
