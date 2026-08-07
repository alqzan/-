import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BabyIcon,
  ChevronLeftIcon,
  BagIcon,
  BellyIcon,
  BottleIcon,
  CalendarIcon,
  DropIcon,
  FootIcon,
  ListIcon,
  MomIcon,
  MoonIcon,
  PillIcon,
  RulerIcon,
  SyringeIcon,
  TagIcon,
  WaveIcon,
} from '../../components/icons'
import { Button, Card, Field, Sheet, cx } from '../../components/ui'
import { useCapture } from '../../components/Capture'
import { updateChild, useAppData } from '../../data/dataService'
import { getPregnancyProgress } from '../../lib/pregnancy'
import { dayKeyOf, dayPlan, dayProgress } from '../../lib/meds'
import { formatDuration, relativeFromNow } from '../../lib/format'
import { isSameLocalDay, localDateInputValue, localDateToIso } from '../../lib/localDate'
import { useNow } from '../../lib/useNow'
import type { AppData } from '../../data/types'

// =============================================================
// «المتابعة» — كل الأدوات في شاشة واحدة، كل واحدة تعرض آخر رقم لها.
// قبلها كان لازم تفتح الشاشة لتعرف هل فيها شيء أصلًا.
// =============================================================

export default function Track() {
  const data = useAppData()
  const born = !!data.child.bornAt

  return (
    <>
      <header className="pt-6 pb-5">
        <div className="eyebrow">{born ? 'رعاية المولود' : 'الحمل والتجهيز'}</div>
        <h1 className="title-lg mt-1.5">المتابعة</h1>
      </header>

      {born ? <BabyTools /> : <PregnancyTools />}
    </>
  )
}

// ============ أدوات مرحلة الحمل ============

function PregnancyTools() {
  const data = useAppData()
  const now = useNow(60000)
  const p = getPregnancyProgress(data.child.lmpDate, data.child.dueDate)

  const lastKick = data.kicks[0]
  const todayKicks = data.kicks
    .filter((k) => isSameLocalDay(k.startedAt))
    .reduce((sum, k) => sum + k.count, 0)
  const upcoming = data.appointments.filter((a) => new Date(a.dateTime).getTime() >= now).length
  const lastMom = data.momLogs[0]
  const hospital = progressOf(data.checklist.filter((c) => c.list === 'hospital'))
  const shopping = progressOf(data.checklist.filter((c) => c.list === 'shopping'))
  const votedNames = data.names.filter((n) => n.votes.mom && n.votes.dad).length
  const meds = medsSummary(data, now)

  return (
    <>
      <Group title="الحمل">
        <ToolRow
          to="/track/development"
          icon={<BellyIcon className="w-5 h-5" />}
          label="تطوّر الجنين"
          value={p ? `الأسبوع ${p.week}` : '—'}
        />
        <ToolRow
          to="/track/kicks"
          icon={<FootIcon className="w-5 h-5" />}
          label="الركلات"
          value={todayKicks > 0 ? `${todayKicks} اليوم` : lastKick ? relativeFromNow(lastKick.startedAt) : 'ابدأوا'}
        />
        <ToolRow
          to="/track/contractions"
          icon={<WaveIcon className="w-5 h-5" />}
          label="الانقباضات"
          value={data.contractions.length > 0 ? `${data.contractions.length} مسجّلة` : 'ابدأوا'}
        />
        <ToolRow
          to="/track/appointments"
          icon={<CalendarIcon className="w-5 h-5" />}
          label="المواعيد"
          value={upcoming > 0 ? `${upcoming} قادمة` : 'ما فيه مواعيد'}
        />
        <ToolRow
          to="/track/mom"
          icon={<MomIcon className="w-5 h-5" />}
          label="متابعة الأم"
          value={lastMom?.weightKg ? `${lastMom.weightKg} كجم` : lastMom ? 'مسجّل' : 'ابدأوا'}
        />
        <ToolRow
          to="/track/meds"
          icon={<PillIcon className="w-5 h-5" />}
          label="الأدوية والعلاج"
          value={meds.value}
          highlight={meds.pending}
          last
        />
      </Group>

      <Group title="التجهيزات">
        <ToolRow
          to="/track/names"
          icon={<TagIcon className="w-5 h-5" />}
          label="الأسماء"
          value={votedNames > 0 ? `${votedNames} متفق عليها` : `${data.names.length} اقتراح`}
        />
        <ToolRow
          to="/track/hospital"
          icon={<BagIcon className="w-5 h-5" />}
          label="شنطة المستشفى"
          value={`${hospital.done}/${hospital.total}`}
        />
        <ToolRow
          to="/track/shopping"
          icon={<ListIcon className="w-5 h-5" />}
          label="مشتريات المولود"
          value={`${shopping.done}/${shopping.total}`}
          last
        />
      </Group>

      <BirthCard />
    </>
  )
}

// ============ أدوات ما بعد الولادة ============

function BabyTools() {
  const data = useAppData()
  const now = useNow(30000)

  const feeds = data.feedings.filter((f) => isSameLocalDay(f.startedAt))
  const diapers = data.diapers.filter((d) => isSameLocalDay(d.time))
  const openSleep = data.sleep.find((s) => !s.endedAt)
  const sleepMin = data.sleep
    .filter((s) => s.endedAt && isSameLocalDay(s.startedAt))
    .reduce((sum, s) => sum + (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000, 0)
  const lastGrowth = [...data.growth].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0]
  const dueVaccines = data.vaccines.filter((v) => !v.givenAt).length
  const upcoming = data.appointments.filter((a) => new Date(a.dateTime).getTime() >= now).length
  const shopping = progressOf(data.checklist.filter((c) => c.list === 'shopping'))
  const meds = medsSummary(data, now)

  return (
    <>
      <Group title="اليوم">
        <ToolRow
          to="/track/feeding"
          icon={<BottleIcon className="w-5 h-5" />}
          label="الرضاعة"
          value={feeds.length > 0 ? `${feeds.length} رضعة` : 'ما فيه رضعات'}
        />
        <ToolRow
          to="/track/diapers"
          icon={<DropIcon className="w-5 h-5" />}
          label="الحفاضات"
          value={diapers.length > 0 ? `${diapers.length} حفاض` : 'ما فيه'}
        />
        <ToolRow
          to="/track/sleep"
          icon={<MoonIcon className="w-5 h-5" />}
          label="النوم"
          value={
            openSleep
              ? `نائم — ${formatDuration((now - new Date(openSleep.startedAt).getTime()) / 1000)}`
              : sleepMin > 0
                ? `${Math.floor(sleepMin / 60)}س ${Math.round(sleepMin % 60)}د`
                : 'ما نام بعد'
          }
          highlight={!!openSleep}
          last
        />
      </Group>

      <Group title="النمو والصحة">
        <ToolRow
          to="/track/growth"
          icon={<RulerIcon className="w-5 h-5" />}
          label="النمو"
          value={lastGrowth?.weightKg ? `${lastGrowth.weightKg} كجم` : 'ما فيه قياسات'}
        />
        <ToolRow
          to="/track/vaccines"
          icon={<SyringeIcon className="w-5 h-5" />}
          label="التطعيمات"
          value={dueVaccines > 0 ? `${dueVaccines} متبقّية` : 'مكتملة'}
        />
        <ToolRow
          to="/track/meds"
          icon={<PillIcon className="w-5 h-5" />}
          label="الأدوية والعلاج"
          value={meds.value}
          highlight={meds.pending}
        />
        <ToolRow
          to="/track/appointments"
          icon={<CalendarIcon className="w-5 h-5" />}
          label="المواعيد"
          value={upcoming > 0 ? `${upcoming} قادمة` : 'ما فيه مواعيد'}
          last
        />
      </Group>

      <Group title="التجهيزات">
        <ToolRow
          to="/track/shopping"
          icon={<ListIcon className="w-5 h-5" />}
          label="مشتريات المولود"
          value={`${shopping.done}/${shopping.total}`}
        />
        <ToolRow
          to="/track/hospital"
          icon={<BagIcon className="w-5 h-5" />}
          label="شنطة المستشفى"
          value="محفوظة"
          last
        />
      </Group>
    </>
  )
}

// ============ تسجيل الولادة ============

function BirthCard() {
  const data = useAppData()
  const { toast } = useCapture()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(localDateInputValue())
  const [time, setTime] = useState('12:00')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <>
      <Card className="mt-7 !bg-moss-50 !border-moss-100">
        <div className="flex items-start gap-3.5">
          <span className="w-10 h-10 rounded-full bg-white/70 text-moss-500 grid place-items-center shrink-0">
            <BabyIcon className="w-5 h-5" />
          </span>
          <div className="flex-1">
            <div className="font-display font-bold text-ink-900">وصل صغيركم؟</div>
            <p className="text-[13px] text-ink-500 mt-1 leading-relaxed">
              سجّلوا الولادة ويتحوّل التطبيق كله لمرحلة الرعاية: رضاعة، نوم، نمو، وتطعيمات.
            </p>
            <Button variant="clay" className="mt-3.5" onClick={() => setOpen(true)}>
              تسجيل الولادة
            </Button>
          </div>
        </div>
      </Card>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="تسجيل الولادة"
        subtitle={`مبروك! ${data.child.name || 'صغيركم'} صار بين أيديكم.`}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="التاريخ">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="الساعة">
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الوزن (كجم)">
            <input type="number" inputMode="decimal" step="0.01" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="الطول (سم)">
            <input type="number" inputMode="decimal" step="0.1" className="input" value={length} onChange={(e) => setLength(e.target.value)} />
          </Field>
        </div>
        <Button
          className="w-full mt-2"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const [h, m] = time.split(':').map(Number)
            const d = new Date(localDateToIso(date))
            d.setHours(h || 0, m || 0, 0, 0)
            await updateChild({
              bornAt: d.toISOString(),
              birthWeightKg: weight.trim() ? Number(weight) : undefined,
              birthLengthCm: length.trim() ? Number(length) : undefined,
            })
            setBusy(false)
            setOpen(false)
            toast('مبروك — سُجّلت الولادة')
          }}
        >
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </Button>
      </Sheet>
    </>
  )
}

// ============ عناصر مشتركة ============

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <div className="eyebrow mb-2.5">{title}</div>
      <div className="card !p-0 overflow-hidden">{children}</div>
    </section>
  )
}

function ToolRow({
  to,
  icon,
  label,
  value,
  last,
  highlight,
}: {
  to: string
  icon: ReactNode
  label: string
  value: string
  last?: boolean
  highlight?: boolean
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className={cx(
        'flex items-center gap-3 w-full text-right px-4 py-3.5 transition active:bg-paper-100',
        !last && 'border-b border-line',
      )}
    >
      <span
        className={cx(
          'w-9 h-9 rounded-full grid place-items-center shrink-0',
          highlight ? 'bg-clay-500 text-white' : 'bg-paper-200 text-ink-600',
        )}
      >
        {icon}
      </span>
      <span className="flex-1 font-medium text-ink-900">{label}</span>
      <span className={cx('text-[13px] tnum', highlight ? 'text-clay-600' : 'text-ink-400')}>
        {value}
      </span>
      <ChevronLeftIcon className="w-4 h-4 text-ink-200 shrink-0" />
    </button>
  )
}

function progressOf(items: Array<{ done: boolean }>) {
  return { done: items.filter((i) => i.done).length, total: items.length }
}

/**
 * ملخّص جرعات اليوم لصفّ «الأدوية».
 *
 * الصفّ يُبرَز (`pending`) ما دامت هناك جرعة لم تُسجَّل — هذا هو الرقم
 * الوحيد الذي يستحقّ أن يلفت النظر في شاشة مليئة بالأرقام.
 */
function medsSummary(data: AppData, now: number): { value: string; pending: boolean } {
  const slots = dayPlan(data.medications, data.medDoses, dayKeyOf(new Date(now)))
  if (slots.length === 0) {
    return { value: data.medications.length > 0 ? 'ما فيه اليوم' : 'ابدأوا', pending: false }
  }
  const { remaining, total } = dayProgress(slots)
  return {
    value: remaining === 0 ? 'اكتملت اليوم' : `باقي ${remaining} من ${total}`,
    pending: remaining > 0,
  }
}
