import { ScreenHeader } from '../../components/Header'
import { Card, EmptyState, StatTile } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { DropIcon, SparkleIcon, TrashIcon } from '../../components/icons'
import { addDiaper, deleteDiaper, useAppData } from '../../data/dataService'
import type { DiaperKind } from '../../data/types'
import { formatShortDate, formatTime, relativeFromNow } from '../../lib/format'
import { isSameLocalDay } from '../../lib/localDate'

const KINDS: Array<{ value: DiaperKind; label: string; cls: string }> = [
  { value: 'wet', label: 'مبلّل', cls: 'bg-moss-50 text-moss-500' },
  { value: 'dirty', label: 'متّسخ', cls: 'bg-clay-50 text-clay-600' },
  { value: 'both', label: 'الاثنان', cls: 'bg-brass-50 text-brass-600' },
]

/** رسم بسيط يميّز نوع التغيير: قطرة، أو قطرتان، أو الاثنان */
function KindMark({ kind, className }: { kind: DiaperKind; className?: string }) {
  if (kind === 'wet') return <DropIcon className={className} />
  if (kind === 'dirty') return <SparkleIcon className={className} />
  return (
    <span className="inline-flex items-center gap-0.5">
      <DropIcon className={className} />
      <SparkleIcon className={className} />
    </span>
  )
}

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
        <StatTile label="مبلّل اليوم" value={wet} icon={<DropIcon className="w-4 h-4" />} />
        <StatTile label="متّسخ اليوم" value={dirty} />
        <StatTile label="آخر تغيير" value={last ? relativeFromNow(last.time) : '—'} />
      </div>

      <Card>
        <div className="text-ink-600 text-sm mb-3">سجّل تغييرًا الآن</div>
        <div className="grid grid-cols-3 gap-3">
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => addDiaper(k.value)}
              className="card !p-4 text-center active:scale-95 transition border border-paper-200"
            >
              <span className={`w-11 h-11 rounded-full grid place-items-center mx-auto mb-2 ${k.cls}`}>
                <KindMark kind={k.value} className="w-5 h-5" />
              </span>
              <div className="text-sm font-medium text-ink-800">{k.label}</div>
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
                  <KindMark kind={d.kind} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-900">{k.label}</div>
                  <div className="text-xs text-ink-400">
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
                  className="text-ink-300 hover:text-clay-600 p-2"
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
