import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BottleIcon,
  CalendarIcon,
  CameraIcon,
  CapsuleIcon,
  CheckIcon,
  DropIcon,
  FeatherIcon,
  FootIcon,
  MicIcon,
  MomIcon,
  MoonIcon,
  RulerIcon,
  StarIcon,
  WaveIcon,
} from './icons'
import { Button, Field, FieldGroup, Segmented, Sheet, cx } from './ui'
import VoiceForm from './VoiceForm'
import {
  addAppointment,
  addCapsule,
  addDiaper,
  addFeeding,
  addGrowth,
  addJournal,
  addKickSession,
  addMilestoneAchieved,
  addMomLog,
  addPhoto,
  endSleep,
  startSleep,
  uid,
  useAppData,
} from '../data/dataService'
import { fileToDataUrl } from '../lib/image'
import { localDateInputValue, localDateToIso } from '../lib/localDate'
import type { AppointmentType, Mood, Parent } from '../data/types'

// =============================================================
// «التقاط» — باب واحد لكل توثيق في التطبيق.
//
// قبل هذا كان على الوالدين معرفة أيّ شاشة تحفظ أيّ نوع؛ الآن زر واحد
// في كل مكان: يختار النوع، يكتب، ويرجع لما كان فيه. لا تنقّل ولا ضياع.
// =============================================================

type CaptureKind =
  | 'photo'
  | 'letter'
  | 'voice'
  | 'milestone'
  | 'capsule'
  | 'appointment'
  | 'growth'
  | 'mom'

interface CaptureApi {
  /** يفتح لوحة التوثيق — بنوع محدّد أو على شاشة الاختيار */
  open: (kind?: CaptureKind, prefill?: { title?: string; text?: string }) => void
  /** رسالة تأكيد قصيرة أسفل الشاشة */
  toast: (message: string) => void
}

const CaptureContext = createContext<CaptureApi | null>(null)

export function useCapture(): CaptureApi {
  const ctx = useContext(CaptureContext)
  if (!ctx) throw new Error('useCapture خارج CaptureProvider')
  return ctx
}

const AUTHOR_KEY = 'tafalna:lastAuthor'

function lastAuthor(): Parent {
  try {
    return localStorage.getItem(AUTHOR_KEY) === 'dad' ? 'dad' : 'mom'
  } catch {
    return 'mom'
  }
}

function rememberAuthor(p: Parent) {
  try {
    localStorage.setItem(AUTHOR_KEY, p)
  } catch {
    /* التخزين ممتلئ أو محجوب — التذكّر ترفٌ لا يوقف الحفظ */
  }
}

/** أنواع يجوز فتحها عبر الرابط (اختصارات التطبيق) */
const URL_KINDS: CaptureKind[] = ['photo', 'letter', 'voice', 'milestone']

/**
 * يفتح لوحة التوثيق حين يُفتح التطبيق من اختصار مثل `?capture=photo`،
 * ثم يمسح المعامل حتى لا تعود اللوحة عند كل رجوع أو إعادة تحميل.
 */
function useCaptureShortcut(open: CaptureApi['open']) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('capture')

  useEffect(() => {
    if (!requested) return
    const kind = URL_KINDS.find((k) => k === requested)
    if (kind) open(kind)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('capture')
        return next
      },
      { replace: true },
    )
  }, [requested, open, setParams])
}

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<CaptureKind | null>(null)
  const [prefill, setPrefill] = useState<{ title?: string; text?: string }>({})
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const toast = useCallback((text: string) => {
    setMessage(text)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(null), 2600)
  }, [])

  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), [])

  const api = useMemo<CaptureApi>(
    () => ({
      open: (k, pre) => {
        setKind(k ?? null)
        setPrefill(pre ?? {})
        setOpen(true)
      },
      toast,
    }),
    [toast],
  )

  useCaptureShortcut(api.open)

  const close = useCallback(() => {
    setOpen(false)
    // نؤجّل تصفير النوع حتى تنتهي حركة الإغلاق فلا يومض المحتوى
    window.setTimeout(() => {
      setKind(null)
      setPrefill({})
    }, 250)
  }, [])

  return (
    <CaptureContext.Provider value={api}>
      {children}
      <CaptureSheet
        open={open}
        kind={kind}
        prefill={prefill}
        onPick={setKind}
        onClose={close}
        onDone={(text) => {
          close()
          toast(text)
        }}
      />
      <ToastHost message={message} />
    </CaptureContext.Provider>
  )
}

function ToastHost({ message }: { message: string | null }) {
  if (!message) return null
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-[60] flex justify-center px-6 print:hidden pointer-events-none"
      // فوق الشريط السفلي وشريط الإيماءات معًا، وإلا اختفت الرسالة خلفهما
      style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
    >
      <div className="animate-rise bg-ink-900 text-paper-50 rounded-full px-5 py-2.5 text-sm shadow-lift flex items-center gap-2">
        <CheckIcon className="w-4 h-4 text-clay-200" />
        {message}
      </div>
    </div>,
    document.body,
  )
}

// ============ لوحة الاختيار ============

const TITLES: Record<CaptureKind, string> = {
  photo: 'صورة',
  letter: 'رسالة',
  voice: 'رسالة صوتية',
  milestone: 'معلَم',
  capsule: 'كبسولة زمنية',
  appointment: 'موعد',
  growth: 'قياس',
  mom: 'يوم الأم',
}

function CaptureSheet({
  open,
  kind,
  prefill,
  onPick,
  onClose,
  onDone,
}: {
  open: boolean
  kind: CaptureKind | null
  prefill: { title?: string; text?: string }
  onPick: (k: CaptureKind) => void
  onClose: () => void
  onDone: (message: string) => void
}) {
  const data = useAppData()
  const born = !!data.child.bornAt

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={kind ? TITLES[kind] : 'وثّقوا هذه اللحظة'}
      subtitle={kind ? undefined : 'كل ما تحفظونه هنا يدخل حكاية طفلكم تلقائيًا'}
    >
      {kind === null && (
        <ChooserView born={born} onPick={onPick} onDone={onDone} onClose={onClose} />
      )}
      {kind === 'photo' && <PhotoForm onDone={onDone} />}
      {kind === 'letter' && <LetterForm prefill={prefill} onDone={onDone} />}
      {kind === 'voice' && <VoiceFormShell onDone={onDone} />}
      {kind === 'milestone' && <MilestoneForm onDone={onDone} />}
      {kind === 'capsule' && <CapsuleForm onDone={onDone} />}
      {kind === 'appointment' && <AppointmentForm onDone={onDone} />}
      {kind === 'growth' && <GrowthForm onDone={onDone} />}
      {kind === 'mom' && <MomForm onDone={onDone} />}
    </Sheet>
  )
}

function ChooserView({
  born,
  onPick,
  onDone,
  onClose,
}: {
  born: boolean
  onPick: (k: CaptureKind) => void
  onDone: (message: string) => void
  onClose: () => void
}) {
  const data = useAppData()
  const navigate = useNavigate()
  const openSleep = data.sleep.find((s) => !s.endedAt)

  const documents: Array<{ kind: CaptureKind; label: string; hint: string; icon: ReactNode }> = [
    { kind: 'photo', label: 'صورة', hint: 'لحظة بالصورة', icon: <CameraIcon className="w-5 h-5" /> },
    { kind: 'letter', label: 'رسالة', hint: 'كلام لطفلكم', icon: <FeatherIcon className="w-5 h-5" /> },
    { kind: 'voice', label: 'صوت', hint: 'يسمع صوتكم', icon: <MicIcon className="w-5 h-5" /> },
    { kind: 'milestone', label: 'معلَم', hint: 'أول مرة يفعلها', icon: <StarIcon className="w-5 h-5" /> },
    { kind: 'capsule', label: 'كبسولة', hint: 'تُفتح مستقبلًا', icon: <CapsuleIcon className="w-5 h-5" /> },
    { kind: 'appointment', label: 'موعد', hint: 'فحص أو زيارة', icon: <CalendarIcon className="w-5 h-5" /> },
    born
      ? { kind: 'growth', label: 'قياس', hint: 'وزن وطول', icon: <RulerIcon className="w-5 h-5" /> }
      : { kind: 'mom', label: 'يوم الأم', hint: 'وزن ومزاج', icon: <MomIcon className="w-5 h-5" /> },
  ]

  return (
    <div>
      {/* تسجيل بضغطة — لا نموذج ولا شاشة */}
      <div className="eyebrow mb-2.5">تسجيل سريع</div>
      <div className="grid grid-cols-3 gap-2.5 mb-7">
        {born ? (
          <>
            <QuickButton
              icon={<BottleIcon className="w-5 h-5" />}
              label="رضعة"
              onClick={async () => {
                await addFeeding({ startedAt: new Date().toISOString(), kind: 'breast' })
                onDone('سُجّلت الرضعة')
              }}
            />
            <QuickButton
              icon={<DropIcon className="w-5 h-5" />}
              label="حفاض"
              onClick={async () => {
                await addDiaper('wet')
                onDone('سُجّل الحفاض')
              }}
            />
            <QuickButton
              icon={<MoonIcon className="w-5 h-5" />}
              label={openSleep ? 'إنهاء النوم' : 'بداية نوم'}
              onClick={async () => {
                if (openSleep) {
                  await endSleep(openSleep.id)
                  onDone('انتهت غفوة')
                } else {
                  await startSleep()
                  onDone('بدأت الغفوة')
                }
              }}
            />
          </>
        ) : (
          <>
            <QuickButton
              icon={<FootIcon className="w-5 h-5" />}
              label="ركلة"
              onClick={async () => {
                const now = new Date().toISOString()
                await addKickSession({ id: uid(), startedAt: now, endedAt: now, count: 1 })
                onDone('سُجّلت ركلة')
              }}
            />
            <QuickButton
              icon={<WaveIcon className="w-5 h-5" />}
              label="انقباضة"
              onClick={() => {
                // الانقباضة تحتاج مؤقّتًا حيًّا، فمكانها شاشتها لا نافذة سريعة
                onClose()
                navigate('/track/contractions')
              }}
            />
            <QuickButton
              icon={<MomIcon className="w-5 h-5" />}
              label="يومي"
              onClick={() => onPick('mom')}
            />
          </>
        )}
      </div>

      <div className="eyebrow mb-2.5">توثيق</div>
      <div className="grid grid-cols-2 gap-2.5">
        {documents.map((d) => (
          <button
            key={d.kind}
            onClick={() => onPick(d.kind)}
            className="card card-press !p-3.5 flex items-center gap-3 text-right"
          >
            <span className="w-10 h-10 rounded-full bg-clay-50 text-clay-500 grid place-items-center shrink-0">
              {d.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-ink-900">{d.label}</span>
              <span className="block text-[12px] text-ink-400 truncate">{d.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function QuickButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line
                 bg-paper-100 py-3.5 text-ink-700 transition active:scale-95"
    >
      <span className="text-clay-500">{icon}</span>
      <span className="text-[13px]">{label}</span>
    </button>
  )
}

// ============ نماذج التوثيق ============

/**
 * غلاف نموذج الصوت: يمسك «بقلم مَن» هنا كي يبقى `VoiceForm` مشغولًا
 * بالتسجيل وحده، ويستخدم منتقي الكاتب نفسه الذي تستخدمه بقية النماذج.
 */
function VoiceFormShell({ onDone }: { onDone: (m: string) => void }) {
  const [author, setAuthor] = useState<Parent>(lastAuthor())
  return (
    <VoiceForm
      author={author}
      authorPicker={<AuthorPicker value={author} onChange={setAuthor} />}
      onDone={onDone}
    />
  )
}

function AuthorPicker({ value, onChange }: { value: Parent; onChange: (p: Parent) => void }) {
  const data = useAppData()
  return (
    <FieldGroup label="بقلم">
      <Segmented
        label="بقلم"
        value={value}
        onChange={(v) => {
          onChange(v)
          rememberAuthor(v)
        }}
        options={[
          { value: 'mom', label: data.child.parents.momName || 'الأم' },
          { value: 'dad', label: data.child.parents.dadName || 'الأب' },
        ]}
      />
    </FieldGroup>
  )
}

function SaveBar({
  onSave,
  disabled,
  busy,
  label = 'حفظ',
}: {
  onSave: () => void
  disabled?: boolean
  busy?: boolean
  label?: string
}) {
  return (
    <Button onClick={onSave} disabled={disabled || busy} className="w-full mt-2">
      {busy ? 'جارٍ الحفظ…' : label}
    </Button>
  )
}

function PhotoForm({ onDone }: { onDone: (m: string) => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState(localDateInputValue())
  const [author, setAuthor] = useState<Parent>(lastAuthor())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <label className="block mb-4 cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setBusy(true)
            try {
              setDataUrl(await fileToDataUrl(file))
              setError(null)
            } catch {
              setError('تعذّرت قراءة الصورة — جرّبوا صورة أخرى.')
            } finally {
              setBusy(false)
            }
          }}
        />
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="الصورة المختارة"
            className="w-full aspect-[4/3] object-cover rounded-2xl border border-line"
          />
        ) : (
          <span className="flex flex-col items-center justify-center gap-2 w-full aspect-[4/3] rounded-2xl border border-dashed border-ink-200 bg-paper-100 text-ink-400">
            <CameraIcon className="w-7 h-7" />
            <span className="text-sm">اختاروا صورة</span>
          </span>
        )}
      </label>

      <Field label="تعليق (اختياري)">
        <input
          className="input"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="وش كان يصير في هذه اللحظة؟"
        />
      </Field>
      <Field label="التاريخ">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <AuthorPicker value={author} onChange={setAuthor} />

      {error && <p className="text-clay-600 text-sm mb-3">{error}</p>}

      <SaveBar
        busy={busy}
        disabled={!dataUrl}
        onSave={async () => {
          if (!dataUrl) return
          setBusy(true)
          const ok = await addPhoto({
            dataUrl,
            caption: caption.trim() || undefined,
            date: localDateToIso(date),
            author,
          })
          setBusy(false)
          if (ok) onDone('حُفظت الصورة في الحكاية')
          else setError('المساحة على الجهاز ممتلئة — احذفوا صورًا أو خذوا نسخة احتياطية.')
        }}
      />
    </div>
  )
}

function LetterForm({
  prefill,
  onDone,
}: {
  prefill: { title?: string; text?: string }
  onDone: (m: string) => void
}) {
  const [title, setTitle] = useState(prefill.title ?? '')
  const [text, setText] = useState(prefill.text ?? '')
  const [date, setDate] = useState(localDateInputValue())
  const [author, setAuthor] = useState<Parent>(lastAuthor())
  const [busy, setBusy] = useState(false)

  return (
    <div>
      <Field label="عنوان (اختياري)">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلًا: أول مرة سمعنا قلبك"
        />
      </Field>
      <Field label="الرسالة">
        <textarea
          className="input font-serif leading-[1.9] min-h-[9rem]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتبوا له كما تكلّمونه…"
          autoFocus
        />
      </Field>
      <Field label="التاريخ">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <AuthorPicker value={author} onChange={setAuthor} />
      <SaveBar
        busy={busy}
        disabled={!text.trim()}
        onSave={async () => {
          setBusy(true)
          await addJournal({
            title: title.trim() || undefined,
            text: text.trim(),
            date: localDateToIso(date),
            author,
          })
          setBusy(false)
          onDone('حُفظت الرسالة')
        }}
      />
    </div>
  )
}

function MilestoneForm({ onDone }: { onDone: (m: string) => void }) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(localDateInputValue())
  const [busy, setBusy] = useState(false)

  return (
    <div>
      <Field label="وش صار؟">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="أول ابتسامة"
          autoFocus
        />
      </Field>
      <Field label="التاريخ">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="الذكرى (اختياري)">
        <textarea
          className="input font-serif leading-[1.9] min-h-[6rem]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="كيف كانت اللحظة؟ من كان معكم؟"
        />
      </Field>
      <SaveBar
        busy={busy}
        disabled={!title.trim()}
        onSave={async () => {
          setBusy(true)
          await addMilestoneAchieved(title.trim(), localDateToIso(date), note.trim() || undefined)
          setBusy(false)
          onDone('أُضيف المعلَم')
        }}
      />
    </div>
  )
}

function CapsuleForm({ onDone }: { onDone: (m: string) => void }) {
  // «اليوم» يُقرأ مرة واحدة عند فتح النموذج: القراءة داخل كل render غير نقيّة،
  // ولا حاجة لتحديثها ما دامت النافذة مفتوحة.
  const [today] = useState(() => new Date())
  const nextYear = new Date(today)
  nextYear.setFullYear(nextYear.getFullYear() + 1)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [openAt, setOpenAt] = useState(localDateInputValue(nextYear))
  const [author, setAuthor] = useState<Parent>(lastAuthor())
  const [busy, setBusy] = useState(false)

  const future = new Date(localDateToIso(openAt)).getTime() > today.getTime()

  return (
    <div>
      <p className="text-[13px] text-ink-500 leading-relaxed mb-5 bg-brass-50 border border-brass-100 rounded-2xl p-3.5">
        رسالة تُقفل حتى التاريخ الذي تختارونه — لا تظهر في الحكاية قبل موعدها.
      </p>
      <Field label="العنوان">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="إلى ابننا في يوم زواجه"
          autoFocus
        />
      </Field>
      <Field label="الرسالة">
        <textarea
          className="input font-serif leading-[1.9] min-h-[8rem]"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>
      <Field label="تُفتح في">
        <input
          type="date"
          className="input"
          value={openAt}
          onChange={(e) => setOpenAt(e.target.value)}
        />
      </Field>
      {!future && <p className="text-clay-600 text-sm mb-3">اختاروا تاريخًا في المستقبل.</p>}
      <AuthorPicker value={author} onChange={setAuthor} />
      <SaveBar
        busy={busy}
        disabled={!title.trim() || !message.trim() || !future}
        onSave={async () => {
          setBusy(true)
          await addCapsule({
            title: title.trim(),
            message: message.trim(),
            author,
            openAt: localDateToIso(openAt),
          })
          setBusy(false)
          onDone('أُقفلت الكبسولة')
        }}
      />
    </div>
  )
}

function AppointmentForm({ onDone }: { onDone: (m: string) => void }) {
  const now = new Date()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<AppointmentType>('checkup')
  const [date, setDate] = useState(localDateInputValue(now))
  const [time, setTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div>
      <Field label="العنوان">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="فحص السونار"
          autoFocus
        />
      </Field>
      <FieldGroup label="النوع">
        <Segmented
          label="النوع"
          value={type}
          onChange={setType}
          options={[
            { value: 'checkup', label: 'متابعة' },
            { value: 'ultrasound', label: 'سونار' },
            { value: 'lab', label: 'تحاليل' },
            { value: 'other', label: 'أخرى' },
          ]}
        />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-3">
        <Field label="التاريخ">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="الساعة">
          <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="المكان (اختياري)">
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
      </Field>
      <SaveBar
        busy={busy}
        disabled={!title.trim()}
        onSave={async () => {
          setBusy(true)
          const [h, m] = time.split(':').map(Number)
          const d = new Date(localDateToIso(date))
          d.setHours(h || 0, m || 0, 0, 0)
          await addAppointment({
            title: title.trim(),
            dateTime: d.toISOString(),
            type,
            location: location.trim() || undefined,
          })
          setBusy(false)
          onDone('أُضيف الموعد')
        }}
      />
    </div>
  )
}

function GrowthForm({ onDone }: { onDone: (m: string) => void }) {
  const [date, setDate] = useState(localDateInputValue())
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [head, setHead] = useState('')
  const [busy, setBusy] = useState(false)

  const num = (v: string) => (v.trim() ? Number(v) : undefined)
  const valid = [weight, length, head].some((v) => v.trim() !== '')

  return (
    <div>
      <Field label="التاريخ">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="الوزن (كجم)">
          <input type="number" inputMode="decimal" step="0.01" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </Field>
        <Field label="الطول (سم)">
          <input type="number" inputMode="decimal" step="0.1" className="input" value={length} onChange={(e) => setLength(e.target.value)} />
        </Field>
        <Field label="الرأس (سم)">
          <input type="number" inputMode="decimal" step="0.1" className="input" value={head} onChange={(e) => setHead(e.target.value)} />
        </Field>
      </div>
      <SaveBar
        busy={busy}
        disabled={!valid}
        onSave={async () => {
          setBusy(true)
          await addGrowth({
            date: localDateToIso(date),
            weightKg: num(weight),
            lengthCm: num(length),
            headCm: num(head),
          })
          setBusy(false)
          onDone('سُجّل القياس')
        }}
      />
    </div>
  )
}

const MOODS: Array<{ value: Mood; label: string }> = [
  { value: 'great', label: 'ممتاز' },
  { value: 'good', label: 'جيد' },
  { value: 'ok', label: 'عادي' },
  { value: 'tired', label: 'متعبة' },
  { value: 'unwell', label: 'تعبانة' },
]

const SYMPTOMS = ['غثيان', 'صداع', 'إرهاق', 'ألم ظهر', 'حرقة', 'أرق', 'تورّم', 'دوخة']

function MomForm({ onDone }: { onDone: (m: string) => void }) {
  const [date, setDate] = useState(localDateInputValue())
  const [weight, setWeight] = useState('')
  const [mood, setMood] = useState<Mood>('good')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div>
      <Field label="التاريخ">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="الوزن (كجم) — اختياري">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          className="input"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </Field>
      <FieldGroup label="كيف كان اليوم؟">
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              className={cx(
                'chip transition',
                mood === m.value && '!bg-clay-500 !text-white',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="أعراض">
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <button
              key={s}
              onClick={() =>
                setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
              }
              className={cx('chip transition', symptoms.includes(s) && '!bg-ink-900 !text-paper-50')}
            >
              {s}
            </button>
          ))}
        </div>
      </FieldGroup>
      <Field label="ملاحظة (اختياري)">
        <textarea
          className="input font-serif leading-[1.9] min-h-[5rem]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <SaveBar
        busy={busy}
        onSave={async () => {
          setBusy(true)
          await addMomLog({
            date: localDateToIso(date),
            weightKg: weight.trim() ? Number(weight) : undefined,
            mood,
            symptoms,
            note: note.trim() || undefined,
          })
          setBusy(false)
          onDone('سُجّل يومكِ')
        }}
      />
    </div>
  )
}
