import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Field, Sheet, cx } from '../../components/ui'
import {
  BottleIcon,
  ChartIcon,
  DropIcon,
  MoonIcon,
  SparkleIcon,
  SyringeIcon,
} from '../../components/icons'
import { updateChild, useAppData } from '../../data/dataService'
import { formatDate } from '../../lib/format'
import { localDateInputValue, localDateToIso } from '../../lib/localDate'

const MODULES = [
  { label: 'الرضاعة', Icon: BottleIcon, tone: 'peach', desc: 'ثدي/رضّاعة، المدة والكمية' },
  { label: 'الحفاضات', Icon: DropIcon, tone: 'sky', desc: 'تتبّع التغييرات' },
  { label: 'النوم', Icon: MoonIcon, tone: 'sage', desc: 'مدد النوم والاستيقاظ' },
  { label: 'النمو', Icon: ChartIcon, tone: 'blush', desc: 'الوزن والطول ومحيط الرأس' },
  { label: 'التطعيمات', Icon: SyringeIcon, tone: 'peach', desc: 'الجدول والتذكيرات' },
] as const

const tones: Record<string, string> = {
  peach: 'bg-peach-100 text-peach-500',
  sky: 'bg-sky-100 text-sky-300',
  sage: 'bg-sage-50 text-sage-500',
  blush: 'bg-blush-100 text-blush-300',
}

export default function BabyCare() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const born = !!data.child.bornAt

  return (
    <>
      <ScreenHeader title="رعاية المولود" subtitle={born ? 'متابعة يومية' : 'تُفعّل بعد الولادة'} back />

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
        <Card className="bg-gradient-to-bl from-peach-400 to-peach-500 !text-white mb-4">
          <div className="font-bold text-lg">{data.child.name}</div>
          <p className="text-sm opacity-90">
            وصل في {formatDate(data.child.bornAt!)}
            {data.child.birthWeightKg ? ` • ${data.child.birthWeightKg} كجم` : ''}
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {MODULES.map(({ label, Icon, tone, desc }) => (
          <div key={label} className={cx('card flex items-center gap-3', !born && 'opacity-70')}>
            <span className={cx('w-12 h-12 rounded-2xl grid place-items-center shrink-0', tones[tone])}>
              <Icon className="w-7 h-7" />
            </span>
            <div className="flex-1">
              <div className="font-bold text-sage-800">{label}</div>
              <div className="text-xs text-sage-400">{desc}</div>
            </div>
            <span className="chip !text-xs">قيد التطوير</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 justify-center text-sage-300 text-xs mt-6">
        <SparkleIcon className="w-4 h-4" />
        <span>هذه الوحدات ستُبنى بالكامل في المرحلة القادمة</span>
      </div>

      <RegisterBirthSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function RegisterBirthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
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
