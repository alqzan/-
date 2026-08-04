import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons'

// ============ أدوات مساعدة ============
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

// ============ بطاقة ============
export function Card({
  children,
  className,
  onClick,
  as,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  as?: 'div' | 'article'
}) {
  const Tag = as ?? 'div'
  if (onClick) {
    return (
      <button onClick={onClick} className={cx('card card-press w-full text-right block', className)}>
        {children}
      </button>
    )
  }
  return <Tag className={cx('card', className)}>{children}</Tag>
}

// ============ خانة إحصائية ============
export function StatTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: ReactNode
  sub?: string
  icon?: ReactNode
}) {
  return (
    <div className="card !p-3.5 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-ink-400 mb-1.5">
        {icon}
        <span className="text-[13px] truncate">{label}</span>
      </div>
      <div className="font-display font-bold text-[22px] text-ink-900 leading-tight tnum truncate">
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-400 mt-0.5 truncate">{sub}</div>}
    </div>
  )
}

// ============ حالة فارغة ============
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      {icon && (
        <div className="w-14 h-14 rounded-full border border-line bg-paper-100 text-ink-300 grid place-items-center mb-4">
          {icon}
        </div>
      )}
      <p className="font-display font-bold text-ink-800 text-lg">{title}</p>
      {hint && <p className="text-ink-400 text-sm mt-1.5 max-w-[17rem] leading-relaxed">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ============ شريط تقدّم ============
export function ProgressBar({ value, tone = 'clay' }: { value: number; tone?: 'clay' | 'ink' }) {
  return (
    <div className="h-1.5 rounded-full bg-paper-300 overflow-hidden">
      <div
        className={cx(
          'h-full rounded-full transition-all duration-500 ease-smooth',
          tone === 'clay' ? 'bg-clay-500' : 'bg-ink-800',
        )}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  )
}

// ============ حلقة تقدّم ============
export function ProgressRing({
  value,
  size = 128,
  stroke = 6,
  trackClass = 'text-paper-300',
  barClass = 'text-clay-500',
  children,
}: {
  value: number
  size?: number
  stroke?: number
  trackClass?: string
  barClass?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * Math.min(1, Math.max(0, value))
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className={trackClass}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className={cx(barClass, 'transition-all duration-700 ease-smooth')}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

// ============ زر ============
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'clay' | 'ghost' | 'outline' | 'peach'
}
export function Button({ variant = 'primary', className, type = 'button', ...rest }: BtnProps) {
  const map = {
    primary: 'btn-primary',
    clay: 'btn-clay',
    peach: 'btn-clay',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
  } as const
  // type="button" افتراضيًا: بدونه يصبح كل زر زرَّ إرسال داخل أي <form> يُضاف لاحقًا
  return <button type={type} className={cx(map[variant], className)} {...rest} />
}

// ============ نافذة سفلية ============
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'

    // نحفظ العنصر الذي كان مركَّزًا لنعيد إليه التركيز عند الإغلاق،
    // وإلا رجع التركيز إلى أول الصفحة وضاع مكان المستخدم.
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute('disabled'))

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // حبس التركيز داخل النافذة: بدونه يخرج Tab إلى محتوى الصفحة
      // المحجوب خلف الطبقة الداكنة فيتوه مستخدم لوحة المفاتيح.
      if (e.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  // نُخرج النافذة إلى <body> بـ Portal: شاشة التطبيق تُنشئ stacking context
  // بسبب حركة الظهور، فكان الشريط السفلي يغطّي أسفل النافذة وأزرارها.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink-900/45 animate-fade" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative w-full max-w-[30rem] bg-paper-50 rounded-t-sheet px-5 pt-3 pb-8
                   shadow-sheet animate-sheet-up max-h-[88vh] overflow-y-auto outline-none"
      >
        {/* مقبض السحب — إشارة بصرية أن النافذة تُغلق للأسفل */}
        <div className="mx-auto w-10 h-1 rounded-full bg-ink-200 mb-4" />
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="title-md">{title}</h3>
            {subtitle && <p className="text-[13px] text-ink-400 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 grid place-items-center rounded-full bg-paper-200 text-ink-500 shrink-0"
            aria-label="إغلاق"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ============ حقل إدخال بعنوان ============
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

/**
 * غلاف لمجموعة أزرار اختيار.
 *
 * لا يصحّ استخدام `Field` هنا: `<label>` واحد يلفّ عدّة أزرار يُنسب
 * إلى أوّلها فقط، فيقرأ قارئ الشاشة عنوان المجموعة على الخيار الأول
 * ويترك البقية بلا سياق. `fieldset/legend` هو البناء الصحيح.
 */
export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="block mb-4 border-0 p-0 m-0">
      <legend className="label p-0">{label}</legend>
      {children}
    </fieldset>
  )
}

// ============ اختيار مقسّم ============
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex bg-paper-200 rounded-full p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-full py-2 text-sm font-medium transition duration-200 ease-smooth',
            value === o.value ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
