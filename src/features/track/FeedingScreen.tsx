import { useEffect, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, StatTile, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { BottleIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { addFeeding, deleteFeeding, useAppData } from '../../data/dataService'
import type { BreastSide, Feeding, FeedingKind } from '../../data/types'
import { formatDuration, formatTime, relativeFromNow } from '../../lib/format'
import { isSameLocalDay } from '../../lib/localDate'
import { useNow } from '../../lib/useNow'

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
  const [mealOpen, setMealOpen] = useState(false)
  const { confirm, dialog } = useConfirm()

  // مؤقّت حيّ + استمرارية الجلسة لو أُغلقت الشاشة
  const now = useNow(active ? 1000 : null)

  useEffect(() => {
    try {
      if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
      else localStorage.removeItem(ACTIVE_KEY)
    } catch {
      // شريط حالة الحفظ العام يغطّي أخطاء التخزين
    }
  }, [active])

  const elapsed = active ? Math.floor((now - active.startedAt) / 1000) : 0

  const isMilk = (k: FeedingKind) => k === 'breast' || k === 'bottle'
  const todayAll = data.feedings.filter((f) => isSameLocalDay(f.startedAt))
  const today = todayAll.filter((f) => isMilk(f.kind))
  const meals = todayAll.length - today.length
  const todayMl = today
    .filter((f) => f.kind === 'bottle')
    .reduce((sum, f) => sum + (f.amountMl ?? 0), 0)
  const last = [...data.feedings].filter((f) => isMilk(f.kind)).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )[0]

  function finishBreast() {
    if (!active) return
    const durationMin = Math.max(1, Math.round((Date.now() - active.startedAt) / 60000))
    void addFeeding({
      startedAt: new Date(active.startedAt).toISOString(),
      kind: 'breast',
      side: active.side,
      durationMin,
    })
    setActive(null)
  }

  return (
    <>
      <ScreenHeader title="الرضاعة والتغذية" subtitle="الحليب والأطعمة والأشربة" back />

      <div className="flex gap-3 mb-4">
        <StatTile label="رضعات اليوم" value={today.length} icon={<BottleIcon className="w-4 h-4" />} />
        <StatTile
          label="آخر رضعة"
          value={last ? relativeFromNow(last.startedAt) : '—'}
          sub={last ? formatTime(last.startedAt) : undefined}
        />
      </div>
      {meals > 0 && (
        <Card className="!p-3.5 mb-4 text-center">
          <span className="text-ink-500 text-sm">وجبات وأشربة اليوم: </span>
          <span className="font-bold text-ink-900">{meals}</span>
        </Card>
      )}
      {todayMl > 0 && (
        <Card className="!p-3.5 mb-4 text-center">
          <span className="text-ink-500 text-sm">إجمالي الرضّاعة اليوم: </span>
          <span className="font-bold text-ink-900">{todayMl} مل</span>
        </Card>
      )}

      {active ? (
        <Card className="text-center bg-gradient-to-b from-paper-50 to-clay-50">
          <div className="text-ink-500 mb-1">
            رضاعة طبيعية — الجهة {active.side === 'left' ? 'اليسرى' : 'اليمنى'}
          </div>
          <div className="text-5xl font-extrabold text-ink-900 tabular-nums my-3">
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
          <div className="text-ink-600 text-sm mb-3">ابدؤوا رضاعة طبيعية</div>
          <div className="flex gap-3 mb-4">
            {(['right', 'left'] as BreastSide[]).map((side) => (
              <button
                key={side}
                onClick={() => setActive({ startedAt: Date.now(), side })}
                className="btn flex-1 py-4 bg-ink-400 text-white shadow-lift hover:bg-ink-500"
              >
                {side === 'right' ? 'اليمنى' : 'اليسرى'}
              </button>
            ))}
          </div>
          <Button variant="ghost" className="w-full py-3" onClick={() => setBottleOpen(true)}>
            <PlusIcon className="w-5 h-5" /> تسجيل رضعة رضّاعة
          </Button>
          <Button variant="ghost" className="w-full py-3 mt-2" onClick={() => setMealOpen(true)}>
            <PlusIcon className="w-5 h-5" /> تسجيل وجبة أو شراب
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
                  f.kind === 'breast' ? 'bg-paper-100 text-ink-500' : 'bg-clay-50 text-clay-600',
                )}
              >
                <BottleIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-900">
                  {feedingLabel(f)}
                </div>
                <div className="text-xs text-ink-400">
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
                className="text-ink-300 hover:text-clay-600 p-2"
                aria-label="حذف"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <BottleSheet open={bottleOpen} onClose={() => setBottleOpen(false)} />
      <MealSheet open={mealOpen} onClose={() => setMealOpen(false)} />
      {dialog}
    </>
  )
}

const MEAL_KINDS: Array<{ value: FeedingKind; label: string }> = [
  { value: 'solid', label: 'وجبة' },
  { value: 'cup', label: 'كوب' },
  { value: 'snack', label: 'خفيفة' },
]

/** وصف سطر السجل حسب النوع — يحفظ شكل الرضاعة القديم كما كان */
function feedingLabel(f: Feeding): string {
  switch (f.kind) {
    case 'breast':
      return `طبيعية • ${f.side === 'left' ? 'اليسرى' : 'اليمنى'}`
    case 'bottle':
      return `رضّاعة • ${f.amountMl ?? 0} مل`
    case 'solid':
      return f.note ? `وجبة • ${f.note}` : 'وجبة'
    case 'cup':
      return `كوب${f.note ? ` • ${f.note}` : ''}${f.amountMl ? ` • ${f.amountMl} مل` : ''}`
    default:
      return f.note ? `وجبة خفيفة • ${f.note}` : 'وجبة خفيفة'
  }
}

/** وجبة أو شراب لمن تجاوز الرضاعة: النوع، ووصف حر اختياري، وكمية للكوب */
function MealSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kind, setKind] = useState<FeedingKind>('solid')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')

  function submit() {
    void addFeeding({
      startedAt: new Date().toISOString(),
      kind,
      note: note.trim() || undefined,
      amountMl: kind === 'cup' && amount ? Number(amount) : undefined,
    })
    setNote('')
    setAmount('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="وجبة أو شراب">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {MEAL_KINDS.map((m) => (
          <button
            key={m.value}
            aria-pressed={kind === m.value}
            onClick={() => setKind(m.value)}
            className={cx(
              'rounded-2xl py-3 text-sm font-medium transition',
              kind === m.value ? 'bg-ink-900 text-paper-50' : 'bg-paper-200 text-ink-600',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <Field label="وش أكل أو شرب؟ (اختياري)">
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثال: عصيدة، موز، حليب"
        />
      </Field>
      {kind === 'cup' && (
        <Field label="الكمية (مل)">
          <input
            type="number"
            inputMode="numeric"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="200"
          />
        </Field>
      )}
      <Button variant="peach" className="w-full" onClick={submit}>
        حفظ
      </Button>
    </Sheet>
  )
}

function BottleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [minutes, setMinutes] = useState('')

  function submit() {
    const kind: FeedingKind = 'bottle'
    void addFeeding({
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
            className="chip !bg-paper-200 !text-ink-600"
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
