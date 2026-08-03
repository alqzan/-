import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, StatTile } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { MoonIcon, TrashIcon } from '../../components/icons'
import { deleteSleep, endSleep, startSleep, useAppData } from '../../data/dataService'
import { formatDuration, formatShortDate, formatTime } from '../../lib/format'
import { isSameLocalDay } from '../../lib/localDate'
import { useNow } from '../../lib/useNow'

/** يحوّل الدقائق إلى «٣ س ٢٠ د» */
function humanMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} د`
  return `${h} س ${m} د`
}

export default function SleepScreen() {
  const data = useAppData()
  const { confirm, dialog } = useConfirm()

  const running = data.sleep.find((s) => !s.endedAt) ?? null

  // المؤقّت يعمل فقط أثناء نوم فعلي — لا نبضة كل ثانية والشاشة ساكنة
  const now = useNow(running ? 1000 : null)

  const elapsed = running
    ? Math.floor((now - new Date(running.startedAt).getTime()) / 1000)
    : 0

  const finished = data.sleep.filter((s) => s.endedAt)
  const todayMinutes = finished
    .filter((s) => isSameLocalDay(s.startedAt))
    .reduce(
      (sum, s) =>
        sum + (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000,
      0,
    )
  const todayNaps = finished.filter((s) => isSameLocalDay(s.startedAt)).length

  return (
    <>
      <ScreenHeader title="النوم" subtitle="مدد النوم والاستيقاظ" back />

      <div className="flex gap-3 mb-4">
        <StatTile
          label="نوم اليوم"
          value={humanMinutes(todayMinutes)}
          icon={<MoonIcon className="w-4 h-4" />}
        />
        <StatTile label="عدد الغفوات" value={todayNaps} />
      </div>

      <Card className="text-center">
        {running ? (
          <>
            <div className="text-ink-500 mb-1">نائم منذ {formatTime(running.startedAt)}</div>
            <div className="text-5xl font-extrabold text-ink-900 tabular-nums my-3">
              {formatDuration(elapsed)}
            </div>
            <Button className="w-full py-4" onClick={() => endSleep(running.id)}>
              استيقظ الآن
            </Button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-paper-100 text-ink-500 grid place-items-center mx-auto mb-3">
              <MoonIcon className="w-10 h-10" />
            </div>
            <p className="text-ink-800 font-medium mb-4">سجّلوا بداية النوم بضغطة</p>
            <Button className="w-full py-4" onClick={() => startSleep()}>
              بدأ النوم
            </Button>
          </>
        )}
      </Card>

      <h2 className="section-title mt-6 mb-3">السجل</h2>
      {finished.length === 0 ? (
        <EmptyState icon={<MoonIcon className="w-8 h-8" />} title="لا فترات نوم مسجّلة بعد" />
      ) : (
        <div className="space-y-2">
          {finished.slice(0, 30).map((s) => {
            const minutes =
              (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000
            return (
              <Card key={s.id} className="!p-3.5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-paper-100 text-ink-500 grid place-items-center shrink-0">
                  <MoonIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-900">{humanMinutes(minutes)}</div>
                  <div className="text-xs text-ink-400">
                    {isSameLocalDay(s.startedAt) ? 'اليوم' : formatShortDate(s.startedAt)} •{' '}
                    {formatTime(s.startedAt)} — {formatTime(s.endedAt!)}
                  </div>
                </div>
                <button
                  onClick={() =>
                    confirm({
                      title: 'حذف فترة النوم؟',
                      confirmLabel: 'حذف',
                      onConfirm: () => deleteSleep(s.id),
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
