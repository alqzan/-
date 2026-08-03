import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Sheet, StatTile } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { ChartIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { addGrowth, deleteGrowth, useAppData } from '../../data/dataService'
import { formatDate } from '../../lib/format'
import { localDateInputValue } from '../../lib/localDate'

export default function GrowthScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const { confirm, dialog } = useConfirm()

  const sorted = [...data.growth].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  const latest = sorted[0]
  const previous = sorted[1]

  const delta =
    latest?.weightKg != null && previous?.weightKg != null
      ? latest.weightKg - previous.weightKg
      : null

  return (
    <>
      <ScreenHeader
        title="النمو"
        subtitle="الوزن والطول ومحيط الرأس"
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-blush-300 text-white shadow-soft"
            aria-label="قياس جديد"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      {latest && (
        <div className="flex gap-3 mb-4">
          <StatTile
            label="الوزن"
            value={latest.weightKg != null ? `${latest.weightKg} كجم` : '—'}
            sub={delta != null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} عن السابق` : undefined}
            icon={<ChartIcon className="w-4 h-4" />}
            tone="blush"
          />
          <StatTile label="الطول" value={latest.lengthCm != null ? `${latest.lengthCm} سم` : '—'} />
          <StatTile label="محيط الرأس" value={latest.headCm != null ? `${latest.headCm} سم` : '—'} />
        </div>
      )}

      <Card className="bg-sky-100 mb-4">
        <p className="text-sm text-sage-600 leading-relaxed">
          هذه الشاشة لتوثيق قياساتكم فقط. تقييم النمو ومقارنته بمنحنيات النمو
          يعود لطبيب الأطفال في زيارات المتابعة.
        </p>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<ChartIcon className="w-8 h-8" />}
          title="لا قياسات بعد"
          hint="سجّلوا قياسات كل زيارة لمتابعة تطوّر مولودكم."
          action={<Button onClick={() => setOpen(true)}>أضف قياسًا</Button>}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((g) => (
            <Card key={g.id} className="!p-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blush-100 text-blush-300 grid place-items-center shrink-0">
                <ChartIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sage-800">{formatDate(g.date)}</div>
                <div className="text-xs text-sage-400 flex flex-wrap gap-x-3">
                  {g.weightKg != null && <span>⚖️ {g.weightKg} كجم</span>}
                  {g.lengthCm != null && <span>📏 {g.lengthCm} سم</span>}
                  {g.headCm != null && <span>🧠 {g.headCm} سم</span>}
                </div>
              </div>
              <button
                onClick={() =>
                  confirm({
                    title: 'حذف هذا القياس؟',
                    confirmLabel: 'حذف',
                    onConfirm: () => deleteGrowth(g.id),
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

      <AddGrowthSheet open={open} onClose={() => setOpen(false)} />
      {dialog}
    </>
  )
}

function AddGrowthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = localDateInputValue()
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [head, setHead] = useState('')

  const valid = weight || length || head

  function submit() {
    if (!valid) return
    void addGrowth({
      date,
      weightKg: weight ? Number(weight) : undefined,
      lengthCm: length ? Number(length) : undefined,
      headCm: head ? Number(head) : undefined,
    })
    setWeight('')
    setLength('')
    setHead('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="قياس جديد">
      <Field label="التاريخ">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="flex gap-3">
        <Field label="الوزن (كجم)">
          <input type="number" inputMode="decimal" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="4.2" />
        </Field>
        <Field label="الطول (سم)">
          <input type="number" inputMode="decimal" className="input" value={length} onChange={(e) => setLength(e.target.value)} placeholder="55" />
        </Field>
      </div>
      <Field label="محيط الرأس (سم)">
        <input type="number" inputMode="decimal" className="input" value={head} onChange={(e) => setHead(e.target.value)} placeholder="37" />
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!valid}>
        حفظ القياس
      </Button>
    </Sheet>
  )
}
