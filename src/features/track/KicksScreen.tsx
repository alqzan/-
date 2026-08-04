import { useEffect, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { ClockIcon, FootIcon, TrashIcon } from '../../components/icons'
import { addKickSession, deleteKickSession, uid, useAppData } from '../../data/dataService'
import { formatDate, formatDuration, formatTime } from '../../lib/format'
import { useNow } from '../../lib/useNow'

const ACTIVE_KEY = 'tafalna:active-kicks'

function loadActive(): { startedAt: number; count: number } | null {
  try {
    const value = localStorage.getItem(ACTIVE_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export default function KicksScreen() {
  const data = useAppData()
  const [active, setActive] = useState<{ startedAt: number; count: number } | null>(loadActive)
  const { confirm, dialog } = useConfirm()

  // مؤقّت حيّ للجلسة النشطة — يتوقّف تمامًا حين لا توجد جلسة
  const now = useNow(active ? 1000 : null)

  useEffect(() => {
    try {
      if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
      else localStorage.removeItem(ACTIVE_KEY)
    } catch {
      // شريط حالة الحفظ العام يظل مسؤولًا عن بيانات الجلسات المكتملة.
    }
  }, [active])

  const elapsed = active ? Math.floor((now - active.startedAt) / 1000) : 0

  function start() {
    setActive({ startedAt: Date.now(), count: 0 })
  }
  function kick() {
    setActive((a) => (a ? { ...a, count: a.count + 1 } : a))
  }
  function finish() {
    if (!active) return
    void addKickSession({
      id: uid(),
      startedAt: new Date(active.startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      count: active.count,
    })
    setActive(null)
  }

  return (
    <>
      <ScreenHeader title="عدّاد الركلات" subtitle="تابعوا حركة صغيركم" back />

      {active ? (
        <Card className="text-center bg-gradient-to-b from-paper-50 to-clay-50">
          <div className="w-40 h-40 rounded-full bg-white shadow-card grid place-items-center mx-auto">
            <div className="text-center">
              <div className="text-5xl font-extrabold text-ink-900">{active.count}</div>
              <div className="text-sm text-ink-400">حركة مسجّلة</div>
            </div>
          </div>
          <div className="text-ink-500 mt-3 tnum flex items-center justify-center gap-1.5">
            <ClockIcon className="w-4 h-4" /> {formatDuration(elapsed)}
          </div>
          <button
            onClick={kick}
            className="btn bg-clay-500 text-white w-full py-5 rounded-3xl text-xl font-bold mt-4 shadow-lift active:scale-95 hover:bg-clay-600"
          >
            سجّلوا ركلة
          </button>
          <Button variant="ghost" className="w-full mt-3" onClick={finish}>
            إنهاء الجلسة وحفظها
          </Button>
        </Card>
      ) : (
        <Card className="text-center">
          <div className="w-20 h-20 rounded-full bg-clay-50 text-clay-600 grid place-items-center mx-auto mb-3">
            <FootIcon className="w-10 h-10" />
          </div>
          <p className="text-ink-800 font-medium mb-1">ابدأ جلسة عدّ جديدة</p>
          <p className="text-sm text-ink-400 mb-4">
            اجلسي مرتاحة وسجّلي الحركات لمتابعة النمط المعتاد لطفلك، دون هدف رقمي افتراضي.
          </p>
          <div className="text-right text-sm text-clay-700 bg-clay-50 rounded-2xl p-3 mb-4 leading-relaxed">
            حركة أقل أو مختلفة عن المعتاد؟ تواصلي فورًا مع جهة الرعاية. التطبيق للتوثيق وليس أداة اطمئنان طبي.
          </div>
          <Button className="w-full" onClick={start}>
            ابدأ العدّ
          </Button>
        </Card>
      )}

      <h2 className="section-title mt-6 mb-3">السجل</h2>
      {data.kicks.length === 0 ? (
        <EmptyState icon={<FootIcon className="w-8 h-8" />} title="لا توجد جلسات بعد" hint="ستظهر جلساتكم المحفوظة هنا." />
      ) : (
        <div className="space-y-2">
          {data.kicks.map((k) => {
            const dur = k.endedAt
              ? Math.floor((new Date(k.endedAt).getTime() - new Date(k.startedAt).getTime()) / 1000)
              : 0
            return (
              <Card key={k.id} className="!p-3.5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-clay-50 text-clay-600 grid place-items-center shrink-0">
                  <span className="font-bold">{k.count}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-900">{k.count} حركة</div>
                  <div className="text-xs text-ink-400">
                    {formatDate(k.startedAt)} • {formatTime(k.startedAt)} • {formatDuration(dur)}
                  </div>
                </div>
                <button
                  onClick={() =>
                    confirm({
                      title: 'حذف هذه الجلسة؟',
                      confirmLabel: 'حذف',
                      onConfirm: () => deleteKickSession(k.id),
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
