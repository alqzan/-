import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Field, StatTile, cx } from '../../components/ui'
import {
  BottleIcon,
  ChartIcon,
  DropIcon,
  MoonIcon,
  SyringeIcon,
} from '../../components/icons'
import { Sheet } from '../../components/ui'
import { updateChild, useAppData } from '../../data/dataService'
import { formatDate, relativeFromNow } from '../../lib/format'
import { ageInDays, isSameLocalDay, localDateInputValue, localDateToIso } from '../../lib/localDate'

const MODULES = [
  { to: '/baby-care/feeding', label: 'الرضاعة', Icon: BottleIcon, tone: 'peach', desc: 'ثدي/رضّاعة، المدة والكمية' },
  { to: '/baby-care/diapers', label: 'الحفاضات', Icon: DropIcon, tone: 'sky', desc: 'تتبّع التغييرات' },
  { to: '/baby-care/sleep', label: 'النوم', Icon: MoonIcon, tone: 'sage', desc: 'مدد النوم والاستيقاظ' },
  { to: '/baby-care/growth', label: 'النمو', Icon: ChartIcon, tone: 'blush', desc: 'الوزن والطول ومحيط الرأس' },
  { to: '/baby-care/vaccines', label: 'التطعيمات', Icon: SyringeIcon, tone: 'peach', desc: 'الجدول والتذكيرات' },
] as const

const tones: Record<string, string> = {
  peach: 'bg-peach-100 text-peach-500',
  sky: 'bg-sky-100 text-sky-300',
  sage: 'bg-sage-50 text-sage-500',
  blush: 'bg-blush-100 text-blush-300',
}

export default function BabyCare() {
  const data = useAppData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const born = !!data.child.bornAt

  const lastFeed = [...data.feedings].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )[0]
  const todayDiapers = data.diapers.filter((d) => isSameLocalDay(d.time)).length
  const sleeping = data.sleep.some((s) => !s.endedAt)

  return (
    <>
      <ScreenHeader
        title="رعاية المولود"
        subtitle={born ? 'متابعة يومية' : 'تُفعّل بعد الولادة'}
        back
      />

      {!born && (
        <Card className="bg-gradient-to-bl from-sage-100 to-sky-100 mb-4 text-center">
          <div className="text-4xl mb-2">🍼</div>
          <p className="text-sage-700 font-medium">هذا القسم جاهز بانتظار مولودكم</p>
          <p className="text-sm text-sage-500 mt-1 mb-4">
            عند تسجيل الولادة يتحوّل التطبيق تلقائيًا لواجهة رعاية المولود.
          </p>
          <Button onClick={() => setOpen(true)}>🎉 تسجيل الولادة</Button>
        </Card>
      )}

      {born && (
        <>
          <Card className="bg-gradient-to-bl from-peach-400 to-peach-500 !text-white mb-4">
            <div className="font-bold text-lg">{data.child.name}</div>
            <p className="text-sm opacity-90">
              عمره {ageInDays(data.child.bornAt!)} يوم • وصل في {formatDate(data.child.bornAt!)}
              {data.child.birthWeightKg ? ` • ${data.child.birthWeightKg} كجم` : ''}
            </p>
          </Card>

          <div className="flex gap-3 mb-4">
            <StatTile
              label="آخر رضعة"
              value={lastFeed ? relativeFromNow(lastFeed.startedAt) : '—'}
              icon={<BottleIcon className="w-4 h-4" />}
              tone="peach"
            />
            <StatTile label="حفاضات اليوم" value={todayDiapers} tone="sky" />
            <StatTile label="النوم" value={sleeping ? 'نائم 🌙' : 'مستيقظ ☀️'} tone="sage" />
          </div>
        </>
      )}

      <div className="space-y-3">
        {MODULES.map(({ to, label, Icon, tone, desc }) => (
          <button
            key={to}
            onClick={() => born && navigate(to)}
            disabled={!born}
            className={cx(
              'card flex items-center gap-3 w-full text-start transition',
              born ? 'active:scale-[0.99]' : 'opacity-70 cursor-default',
            )}
          >
            <span className={cx('w-12 h-12 rounded-2xl grid place-items-center shrink-0', tones[tone])}>
              <Icon className="w-7 h-7" />
            </span>
            <div className="flex-1">
              <div className="font-bold text-sage-800">{label}</div>
              <div className="text-xs text-sage-400">{desc}</div>
            </div>
            {!born && <span className="chip !text-xs">بعد الولادة</span>}
          </button>
        ))}
      </div>

      <RegisterBirthSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function RegisterBirthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useAppData()
  const [name, setName] = useState(data.child.name)
  const today = localDateInputValue()
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')

  function submit() {
    updateChild({
      name: name.trim() || 'مولودنا',
      bornAt: localDateToIso(date),
      birthWeightKg: weight ? Number(weight) : undefined,
      birthLengthCm: length ? Number(length) : undefined,
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="تسجيل الولادة 🎉">
      <Field label="اسم المولود">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب الاسم" />
      </Field>
      <Field label="تاريخ الولادة">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="flex gap-3">
        <Field label="الوزن (كجم)">
          <input type="number" inputMode="decimal" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="3.2" />
        </Field>
        <Field label="الطول (سم)">
          <input type="number" inputMode="decimal" className="input" value={length} onChange={(e) => setLength(e.target.value)} placeholder="50" />
        </Field>
      </div>
      <Button className="w-full mt-2" onClick={submit}>
        حفظ وتفعيل رعاية المولود
      </Button>
    </Sheet>
  )
}
