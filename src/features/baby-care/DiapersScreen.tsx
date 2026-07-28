import { ScreenHeader } from '../../components/Header'
import { Card, EmptyState, StatTile } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { DropIcon, TrashIcon } from '../../components/icons'
import { addDiaper, deleteDiaper, useAppData } from '../../data/dataService'
import type { DiaperKind } from '../../data/types'
import { formatShortDate, formatTime, relativeFromNow } from '../../lib/format'
import { isSameLocalDay } from '../../lib/localDate'

const KINDS: Array<{ value: DiaperKind; emoji: string; label: string; cls: string }> = [
  { value: 'wet', emoji: '💧', label: 'مبلّل', cls: 'bg-sky-100 text-sky-300' },
  { value: 'dirty', emoji: '💩', label: 'متّسخ', cls: 'bg-peach-100 text-peach-500' },
  { value: 'both', emoji: '💧💩', label: 'الاثنان', cls: 'bg-blush-100 text-blush-300' },
]

const labelOf = (k: DiaperKind) => KINDS.find((x) => x.value === k)!

export default function DiapersScreen() {
  const data = useAppData()
  const { confirm, dialog } = useConfirm()

  const today = data.diapers.filter((d) => isSameLocalDay(d.time))
  const wet = today.filter((d) => d.kind === 'wet' || d.kind === 'both').length
  const dirty = today.filter((d) => d.kind === 'dirty' || d.kind === 'both').length
  const last = [...data.diapers].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  )[0]

  return (
    <>
      <ScreenHeader title="الحفاضات" subtitle="سجّل بضغطة واحدة" back />

      <div className="flex gap-3 mb-4">
        <StatTile label="مبلّل اليوم" value={wet} icon={<DropIcon className="w-4 h-4" />} tone="sky" />
        <StatTile label="متّسخ اليوم" value={dirty} tone="peach" />
        <StatTile label="آخر تغيير" value={last ? relativeFromNow(last.time) : '—'} />
      </div>

      <Card>
        <div className="text-sage-600 text-sm mb-3">سجّل تغييرًا الآن</div>
        <div className="grid grid-cols-3 gap-3">
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => addDiaper(k.value)}
              className="card !p-4 text-center active:scale-95 transition border border-cream-200"
            >
              <div className="text-3xl mb-1">{k.emoji}</div>
              <div className="text-sm font-medium text-sage-700">{k.label}</div>
            </button>
          ))}
        </div>
      </Card>

      <h2 className="section-title mt-6 mb-3">السجل</h2>
      {data.diapers.length === 0 ? (
        <EmptyState icon={<DropIcon className="w-8 h-8" />} title="لا تغييرات مسجّلة بعد" />
      ) : (
        <div className="space-y-2">
          {data.diapers.slice(0, 40).map((d) => {
            const k = labelOf(d.kind)
            return (
              <Card key={d.id} className="!p-3.5 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full grid place-items-center shrink-0 ${k.cls}`}>
                  <span className="text-lg">{k.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sage-800">{k.label}</div>
                  <div className="text-xs text-sage-400">
                    {isSameLocalDay(d.time) ? 'اليوم' : formatShortDate(d.time)} • {formatTime(d.time)}
                  </div>
                </div>
                <button
                  onClick={() =>
                    confirm({
                      title: 'حذف هذا السجل؟',
                      confirmLabel: 'حذف',
                      onConfirm: () => deleteDiaper(d.id),
                    })
                  }
                  className="text-sage-300 hover:text-red-600 p-2"
                  aria-label="حذف"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </Card>
            )
          })}
        </div>
      )}

      {dialog}
    </>
  )
}
