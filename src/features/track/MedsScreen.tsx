import { useMemo, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, FieldGroup, ProgressBar, Segmented, Sheet, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import {
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  CloseIcon,
  PillIcon,
  PlusIcon,
  SyringeIcon,
  TrashIcon,
} from '../../components/icons'
import {
  addMedication,
  deleteDose,
  deleteMedication,
  logAsNeededDose,
  setMedicationArchived,
  toggleDose,
  toggleDoseSkipped,
  updateMedication,
  useAppData,
} from '../../data/dataService'
import {
  asNeededLogsOn,
  dayKeyOf,
  dayPlan,
  dayProgress,
  formLabel,
  formatSlotTime,
  isMedActiveOn,
  isOverdue,
  scheduleLabel,
  shiftDay,
  WEEKDAY_NAMES,
  MED_FORMS,
  type DoseSlot,
} from '../../lib/meds'
import { formatShortDate, formatTime } from '../../lib/format'
import { localDateInputValue } from '../../lib/localDate'
import { useNow } from '../../lib/useNow'
import type { MedFrequency, Medication, MedicationForm, MedicationWho } from '../../data/types'

// =============================================================
// «الأدوية والعلاج».
//
// الشاشة تجيب عن سؤال واحد تسأله الأم عشر مرات في اليوم: **وش باقي عليّ
// الحين؟** لذلك يومُ اليوم هو الواجهة، وقائمة الأدوية نفسها تحته — لا
// العكس. الوصفة تُكتب مرة، أما الجرعات فتُتابَع كل يوم.
// =============================================================

export default function MedsScreen() {
  const data = useAppData()
  // الجرعة تتأخّر بمرور الوقت لا بضغطة زر — نتفقّد الساعة كل دقيقة
  const now = useNow(60000)
  const today = dayKeyOf(new Date(now))

  const [day, setDay] = useState(today)
  const [editing, setEditing] = useState<Medication | null>(null)
  const [adding, setAdding] = useState(false)
  const { confirm, dialog } = useConfirm()

  const slots = useMemo(
    () => dayPlan(data.medications, data.medDoses, day),
    [data.medications, data.medDoses, day],
  )
  const prnLogs = useMemo(
    () => asNeededLogsOn(data.medications, data.medDoses, day),
    [data.medications, data.medDoses, day],
  )
  const prnMeds = useMemo(
    () => data.medications.filter((m) => m.frequency === 'asNeeded' && isMedActiveOn(m, day)),
    [data.medications, day],
  )

  const progress = dayProgress(slots)
  const nowDate = new Date(now)

  // الجرعات المتماثلة في الوقت تُعرض تحت عنوان واحد — «الثامنة صباحًا»
  // مجموعةً واحدة أسهل قراءةً من ثلاثة صفوف متكرّرة الوقت.
  const byTime = new Map<string, DoseSlot[]>()
  for (const slot of slots) {
    if (!byTime.has(slot.time)) byTime.set(slot.time, [])
    byTime.get(slot.time)!.push(slot)
  }

  const current = editing ? (data.medications.find((m) => m.id === editing.id) ?? null) : null

  return (
    <>
      <ScreenHeader
        title="الأدوية والعلاج"
        subtitle="جرعات اليوم كما وصفتها الطبيبة"
        back
        action={
          <button
            onClick={() => setAdding(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-clay-500 text-white shadow-lift"
            aria-label="إضافة دواء"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <DayNav day={day} today={today} onChange={setDay} />

      {data.medications.length === 0 ? (
        <EmptyState
          icon={<PillIcon className="w-8 h-8" />}
          title="ما فيه أدوية مسجّلة"
          hint="أضيفوا ما وصفته الطبيبة — حبوب أو تحميلة أو إبرة — ويطلع لكم جدول الجرعات كل يوم."
          action={<Button onClick={() => setAdding(true)}>أضيفوا أول دواء</Button>}
        />
      ) : (
        <>
          {slots.length > 0 && (
            <Card className="mb-4">
              <div className="flex items-end justify-between mb-2.5">
                <div>
                  <div className="font-display font-bold text-ink-900 text-[17px]">
                    {progress.remaining === 0
                      ? 'خلصت جرعات اليوم'
                      : `باقي ${progress.remaining} من ${progress.total}`}
                  </div>
                  <div className="text-[12px] text-ink-400 mt-0.5">
                    {progress.taken} مأخوذة
                    {progress.skipped > 0 && ` • ${progress.skipped} متخطّاة`}
                  </div>
                </div>
                <span
                  className={cx(
                    'chip !text-xs',
                    progress.remaining === 0 && '!bg-moss-50 !text-moss-600',
                  )}
                >
                  {Math.round(progress.ratio * 100)}%
                </span>
              </div>
              <ProgressBar value={progress.ratio} />
            </Card>
          )}

          {slots.length === 0 && prnMeds.length === 0 ? (
            <Card className="text-center py-8">
              <ClockIcon className="w-7 h-7 text-ink-300 mx-auto" />
              <p className="font-display font-bold text-ink-800 mt-3">ما فيه جرعات هذا اليوم</p>
              <p className="text-sm text-ink-400 mt-1.5 leading-relaxed">
                لا شيء مستحقّ حسب الجدول — ارتاحوا.
              </p>
            </Card>
          ) : (
            [...byTime.entries()].map(([time, group]) => (
              <section key={time} className="mb-5">
                <div className="eyebrow mb-2.5">{formatSlotTime(time)}</div>
                <div className="space-y-2">
                  {group.map((slot) => (
                    <DoseRow
                      key={slot.key}
                      slot={slot}
                      now={nowDate}
                      onOpen={() => setEditing(slot.med)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          {/* عند اللزوم — بلا موعد، فلا مكان لها في الخط الزمني للنهار */}
          {prnMeds.length > 0 && (
            <section className="mb-5">
              <div className="eyebrow mb-2.5">عند اللزوم</div>
              <div className="space-y-2">
                {prnMeds.map((med) => {
                  const taken = prnLogs.filter((r) => r.med.id === med.id)
                  return (
                    <Card key={med.id} className="!p-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-paper-200 text-ink-500 grid place-items-center shrink-0">
                          <FormIcon form={med.form} className="w-5 h-5" />
                        </span>
                        <button
                          onClick={() => setEditing(med)}
                          className="flex-1 min-w-0 text-right"
                        >
                          <span className="block font-medium text-ink-900 truncate">{med.name}</span>
                          <span className="block text-[12px] text-ink-400 mt-0.5 truncate">
                            {taken.length > 0 ? `${taken.length} اليوم` : med.dose || 'عند اللزوم'}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          className="shrink-0 !text-[13px]"
                          onClick={() => void logAsNeededDose(med.id, day)}
                        >
                          سجّل جرعة
                        </Button>
                      </div>
                      {taken.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-line">
                          {taken.map(({ log }) => (
                            <button
                              key={log.id}
                              onClick={() =>
                                confirm({
                                  title: 'حذف هذه الجرعة؟',
                                  confirmLabel: 'حذف',
                                  onConfirm: () => void deleteDose(log.id),
                                })
                              }
                              className="chip !bg-moss-50 !text-moss-600 !text-xs"
                              aria-label={`حذف جرعة ${formatTime(log.takenAt)}`}
                            >
                              {formatTime(log.takenAt)}
                              <CloseIcon className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          <MedList meds={data.medications} day={day} onOpen={setEditing} />
        </>
      )}

      <MedSheet
        open={adding}
        med={null}
        defaultWho={data.child.bornAt ? 'baby' : 'mom'}
        onClose={() => setAdding(false)}
      />
      <MedSheet
        open={!!current}
        med={current}
        defaultWho={data.child.bornAt ? 'baby' : 'mom'}
        onClose={() => setEditing(null)}
        onDelete={(med) =>
          confirm({
            title: `حذف «${med.name}» وكل سجلّ جرعاته؟`,
            message: 'لو انتهى العلاج فقط، «إيقاف الدواء» يحفظ السجل ويوقف الجرعات.',
            confirmLabel: 'حذف',
            onConfirm: () => {
              void deleteMedication(med.id)
              setEditing(null)
            },
          })
        }
      />
      {dialog}
    </>
  )
}

// ============ التنقّل بين الأيام ============

/**
 * شريط يوم واحد بسهمين.
 *
 * الرجوع للأمس ضرورة لا رفاهية: جرعة الليل تُسجَّل صباح اليوم التالي
 * كثيرًا، وبدون رجوع يبقى الأمس ناقصًا إلى الأبد. التقدّم للمستقبل
 * مسموح للاطّلاع على الجدول، لكن أزرار التسجيل تُقفل هناك.
 */
function DayNav({
  day,
  today,
  onChange,
}: {
  day: string
  today: string
  onChange: (d: string) => void
}) {
  const label =
    day === today
      ? 'اليوم'
      : day === shiftDay(today, -1)
        ? 'أمس'
        : day === shiftDay(today, 1)
          ? 'بكرة'
          : formatShortDate(`${day}T12:00:00`)

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={() => onChange(shiftDay(day, -1))}
        className="btn-icon shrink-0 rotate-180"
        aria-label="اليوم السابق"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => onChange(today)}
        disabled={day === today}
        className="flex-1 min-h-[44px] rounded-2xl border border-line bg-paper-100 px-4
                   font-display font-bold text-ink-900 disabled:opacity-100"
      >
        {label}
      </button>
      <button
        onClick={() => onChange(shiftDay(day, 1))}
        className="btn-icon shrink-0"
        aria-label="اليوم التالي"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
    </div>
  )
}

// ============ صفّ جرعة ============

function DoseRow({
  slot,
  now,
  onOpen,
}: {
  slot: DoseSlot
  now: Date
  onOpen: () => void
}) {
  const taken = !!slot.log && !slot.log.skipped
  const skipped = !!slot.log?.skipped
  const late = isOverdue(slot, now)
  // لا نسجّل جرعة لم يحن يومها بعد — تسجيلها اليوم يعني سجلًّا كاذبًا
  const future = slot.day > dayKeyOf(now)

  return (
    <div
      className={cx(
        'card !p-3.5 flex items-center gap-3',
        late && '!border-clay-200 !bg-clay-50',
        (taken || skipped) && 'opacity-70',
      )}
    >
      <button
        onClick={() => void toggleDose(slot.med.id, slot.day, slot.time)}
        disabled={future}
        aria-pressed={taken}
        aria-label={taken ? `تراجع عن ${slot.med.name}` : `تسجيل ${slot.med.name} كمأخوذة`}
        className={cx(
          'w-11 h-11 rounded-full grid place-items-center shrink-0 transition active:scale-90',
          'disabled:opacity-40 disabled:pointer-events-none',
          taken
            ? 'bg-moss-500 text-white'
            : skipped
              ? 'bg-paper-300 text-ink-400'
              : 'bg-paper-200 text-ink-500',
        )}
      >
        {taken ? (
          <CheckIcon className="w-5 h-5" />
        ) : skipped ? (
          <CloseIcon className="w-5 h-5" />
        ) : (
          <FormIcon form={slot.med.form} className="w-5 h-5" />
        )}
      </button>

      <button onClick={onOpen} className="flex-1 min-w-0 text-right">
        <span
          className={cx(
            'block font-medium text-ink-900 truncate',
            (taken || skipped) && 'line-through decoration-ink-300',
          )}
        >
          {slot.med.name}
        </span>
        <span className="block text-[12px] text-ink-400 mt-0.5 truncate">
          {[slot.med.dose, formLabel(slot.med.form)].filter(Boolean).join(' • ')}
        </span>
      </button>

      {late && <span className="chip !bg-clay-100 !text-clay-700 !text-xs shrink-0">متأخّرة</span>}

      {/* «تخطّي» تظهر للجرعات المعلّقة فقط — بعد التسجيل تحلّ محلّها
          صفة الحالة، ودائرة اليسار وحدها كافية للتراجع. */}
      {!slot.log && !future && (
        <button
          onClick={() => void toggleDoseSkipped(slot.med.id, slot.day, slot.time)}
          className={cx('text-[12px] px-2 py-2 shrink-0', late ? 'text-clay-600' : 'text-ink-400')}
        >
          تخطّي
        </button>
      )}
      {skipped && <span className="chip !text-xs shrink-0">متخطّاة</span>}
    </div>
  )
}

function FormIcon({ form, className }: { form: MedicationForm; className?: string }) {
  return form === 'injection' ? (
    <SyringeIcon className={className} />
  ) : (
    <PillIcon className={className} />
  )
}

// ============ قائمة الأدوية ============

function MedList({
  meds,
  day,
  onOpen,
}: {
  meds: Medication[]
  day: string
  onOpen: (m: Medication) => void
}) {
  const active = meds.filter((m) => !m.archived)
  const stopped = meds.filter((m) => m.archived)

  return (
    <>
      <section className="mt-7">
        <div className="eyebrow mb-2.5">الوصفة</div>
        <div className="card !p-0 overflow-hidden">
          {active.map((med, i) => (
            <MedRow
              key={med.id}
              med={med}
              day={day}
              onOpen={() => onOpen(med)}
              last={i === active.length - 1}
            />
          ))}
          {active.length === 0 && (
            <p className="text-sm text-ink-400 px-4 py-5 text-center">
              كل الأدوية موقوفة حاليًا.
            </p>
          )}
        </div>
      </section>

      {stopped.length > 0 && (
        <section className="mt-7">
          <div className="eyebrow mb-2.5">موقوفة</div>
          <div className="card !p-0 overflow-hidden opacity-70">
            {stopped.map((med, i) => (
              <MedRow
                key={med.id}
                med={med}
                day={day}
                onOpen={() => onOpen(med)}
                last={i === stopped.length - 1}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function MedRow({
  med,
  day,
  onOpen,
  last,
}: {
  med: Medication
  day: string
  onOpen: () => void
  last: boolean
}) {
  // «انتهى» ليس نفسه «موقوف»: الأول بلغ يوم نهايته، والثاني أوقفه الوالدان
  const ended = !med.archived && !!med.endDate && day > med.endDate

  return (
    <button
      onClick={onOpen}
      className={cx(
        'flex items-center gap-3 w-full text-right px-4 py-3.5 transition active:bg-paper-100',
        !last && 'border-b border-line',
      )}
    >
      <span className="w-9 h-9 rounded-full bg-paper-200 text-ink-600 grid place-items-center shrink-0">
        <FormIcon form={med.form} className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium text-ink-900 truncate">{med.name}</span>
        <span className="block text-[12px] text-ink-400 mt-0.5 truncate">
          {scheduleLabel(med)}
          {med.dose ? ` • ${med.dose}` : ''}
        </span>
      </span>
      {med.archived ? (
        <span className="chip !text-xs shrink-0">موقوف</span>
      ) : ended ? (
        <span className="chip !text-xs shrink-0">انتهى</span>
      ) : (
        <span className="chip !bg-paper-100 !text-ink-500 !text-xs shrink-0">
          {med.who === 'mom' ? 'للأم' : 'للطفل'}
        </span>
      )}
      <ChevronLeftIcon className="w-4 h-4 text-ink-200 shrink-0" />
    </button>
  )
}

// ============ إضافة وتعديل دواء ============

const FREQUENCIES: Array<{ value: MedFrequency; label: string }> = [
  { value: 'daily', label: 'كل يوم' },
  { value: 'everyNDays', label: 'يوم بعد يوم' },
  { value: 'weekdays', label: 'أيام محدّدة' },
  { value: 'asNeeded', label: 'عند اللزوم' },
]

/**
 * أوقات افتراضية معقولة لكل عدد جرعات.
 *
 * ضبط ثلاثة أوقات يدويًا في كل مرة عملٌ ممل، والأغلب أن الطبيبة قالت
 * «ثلاث مرات باليوم» بلا ساعات محدّدة. هذه الأوقات موزّعة على ساعات
 * اليقظة، ويبقى تعديل أيّها ممكنًا.
 */
const DEFAULT_TIMES: Record<number, string[]> = {
  1: ['08:00'],
  2: ['08:00', '20:00'],
  3: ['08:00', '14:00', '20:00'],
  4: ['08:00', '13:00', '18:00', '22:00'],
}

function MedSheet({
  open,
  med,
  defaultWho,
  onClose,
  onDelete,
}: {
  open: boolean
  med: Medication | null
  defaultWho: MedicationWho
  onClose: () => void
  onDelete?: (m: Medication) => void
}) {
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [form, setForm] = useState<MedicationForm>('pill')
  const [dose, setDose] = useState('')
  const [frequency, setFrequency] = useState<MedFrequency>('daily')
  const [times, setTimes] = useState<string[]>(DEFAULT_TIMES[1])
  const [everyDays, setEveryDays] = useState('2')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [startDate, setStartDate] = useState(localDateInputValue())
  const [endDate, setEndDate] = useState('')
  const [who, setWho] = useState<MedicationWho>(defaultWho)
  const [notes, setNotes] = useState('')

  // تعبئة النموذج من الدواء المفتوح — أو تفريغه لدواء جديد.
  // المقارنة بالمعرّف لا بـ`open`: فتح دواء آخر وهي مفتوحة يعيد التعبئة.
  const key = med?.id ?? (open ? 'new' : null)
  if (key !== loadedId) {
    setLoadedId(key)
    if (med) {
      setName(med.name)
      setForm(med.form)
      setDose(med.dose ?? '')
      setFrequency(med.frequency)
      setTimes(med.times.length > 0 ? med.times : DEFAULT_TIMES[1])
      setEveryDays(String(med.everyDays ?? 2))
      setWeekdays(med.weekdays ?? [])
      setStartDate(med.startDate)
      setEndDate(med.endDate ?? '')
      setWho(med.who)
      setNotes(med.notes ?? '')
    } else if (open) {
      setName('')
      setForm('pill')
      setDose('')
      setFrequency('daily')
      setTimes(DEFAULT_TIMES[1])
      setEveryDays('2')
      setWeekdays([])
      setStartDate(localDateInputValue())
      setEndDate('')
      setWho(defaultWho)
      setNotes('')
    }
  }

  const scheduled = frequency !== 'asNeeded'

  function setCount(count: number) {
    setTimes((cur) => {
      if (count <= cur.length) return cur.slice(0, count)
      // نُبقي ما عدّله المستخدم ونكمل الناقص من الأوقات الافتراضية
      const defaults = DEFAULT_TIMES[count] ?? DEFAULT_TIMES[4]
      return [...cur, ...defaults.slice(cur.length, count)]
    })
  }

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    const sorted = scheduled ? [...times].sort() : []
    const payload = {
      name: trimmed,
      form,
      dose: dose.trim() || undefined,
      frequency,
      times: sorted,
      everyDays: frequency === 'everyNDays' ? Math.max(1, Number(everyDays) || 2) : undefined,
      weekdays: frequency === 'weekdays' ? [...weekdays].sort((a, b) => a - b) : undefined,
      startDate,
      endDate: endDate || null,
      who,
      notes: notes.trim() || undefined,
    }
    if (med) void updateMedication(med.id, payload)
    else void addMedication(payload)
    onClose()
  }

  const invalid = !name.trim() || (frequency === 'weekdays' && weekdays.length === 0)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={med ? 'تعديل الدواء' : 'دواء جديد'}
      subtitle={med ? scheduleLabel(med) : 'ما وصفته الطبيبة — حبوب أو تحميلة أو إبرة'}
    >
      <Field label="الاسم">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: حديد + فوليك"
        />
      </Field>

      <FieldGroup label="الشكل">
        <div className="flex flex-wrap gap-2">
          {MED_FORMS.map((f) => (
            <button
              key={f.value}
              onClick={() => setForm(f.value)}
              aria-pressed={form === f.value}
              className={cx(
                'rounded-full px-3 py-1.5 text-sm border transition',
                form === f.value
                  ? 'bg-clay-500 text-white border-clay-500'
                  : 'bg-white text-ink-600 border-paper-300',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </FieldGroup>

      <Field label="الجرعة (اختياري)">
        <input
          className="input"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder="حبة واحدة"
        />
      </Field>

      <FieldGroup label="التكرار">
        <div className="grid grid-cols-2 gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              onClick={() => setFrequency(f.value)}
              aria-pressed={frequency === f.value}
              className={cx(
                'rounded-2xl py-2.5 text-[13px] border transition',
                frequency === f.value
                  ? 'bg-ink-900 text-paper-50 border-ink-900'
                  : 'bg-white border-line text-ink-600',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </FieldGroup>

      {frequency === 'everyNDays' && (
        <Field label="كل كم يوم؟">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="input"
            value={everyDays}
            onChange={(e) => setEveryDays(e.target.value)}
          />
        </Field>
      )}

      {frequency === 'weekdays' && (
        <FieldGroup label="أيام الأسبوع">
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_NAMES.map((label, index) => (
              <button
                key={label}
                onClick={() =>
                  setWeekdays((cur) =>
                    cur.includes(index) ? cur.filter((d) => d !== index) : [...cur, index],
                  )
                }
                aria-pressed={weekdays.includes(index)}
                className={cx(
                  'rounded-full px-3 py-1.5 text-sm border transition',
                  weekdays.includes(index)
                    ? 'bg-clay-500 text-white border-clay-500'
                    : 'bg-white text-ink-600 border-paper-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </FieldGroup>
      )}

      {scheduled && (
        <>
          <FieldGroup label="كم مرة في اليوم؟">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  aria-pressed={times.length === n}
                  className={cx(
                    'flex-1 rounded-2xl py-2.5 text-[13px] border transition tnum',
                    times.length === n
                      ? 'bg-ink-900 text-paper-50 border-ink-900'
                      : 'bg-white border-line text-ink-600',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="أوقات الجرعات">
            <div className="grid grid-cols-2 gap-2">
              {times.map((time, index) => (
                <input
                  key={index}
                  type="time"
                  className="input"
                  value={time}
                  aria-label={`وقت الجرعة ${index + 1}`}
                  onChange={(e) =>
                    setTimes((cur) => cur.map((t, i) => (i === index ? e.target.value : t)))
                  }
                />
              ))}
            </div>
          </FieldGroup>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="يبدأ في">
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="ينتهي في (اختياري)">
          <input
            type="date"
            className="input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>

      <FieldGroup label="لمن؟">
        <Segmented
          label="لمن هذا الدواء"
          value={who}
          onChange={setWho}
          options={[
            { value: 'mom', label: 'للأم' },
            { value: 'baby', label: 'للطفل' },
          ]}
        />
      </FieldGroup>

      <Field label="ملاحظة (اختياري)">
        <textarea
          className="input min-h-[70px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="بعد الأكل، مع كوب ماء…"
        />
      </Field>

      <Button className="w-full mt-2" onClick={submit} disabled={invalid}>
        {med ? 'حفظ التعديل' : 'إضافة الدواء'}
      </Button>

      {med && (
        <>
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => {
              void setMedicationArchived(med.id, !med.archived)
              onClose()
            }}
          >
            {med.archived ? 'استئناف الدواء' : 'إيقاف الدواء'}
          </Button>
          {onDelete && (
            <Button variant="ghost" className="w-full mt-2 !text-red-700" onClick={() => onDelete(med)}>
              <TrashIcon className="w-5 h-5" /> حذف مع سجلّ الجرعات
            </Button>
          )}
        </>
      )}
    </Sheet>
  )
}
