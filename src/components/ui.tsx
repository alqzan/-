import {
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { CloseIcon, PlusIcon } from './icons'

// ============ أدوات مساعدة ============
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

// ============ بطاقة ============
export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={cx('card', onClick && 'cursor-pointer active:scale-[0.99] transition', className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// ============ عنوان قسم ============
export function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-3 mt-6 first:mt-0">
      <h2 className="section-title mb-0">{title}</h2>
      {action}
    </div>
  )
}

// ============ خانة إحصائية ============
export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = 'sage',
}: {
  label: string
  value: ReactNode
  sub?: string
  icon?: ReactNode
  tone?: 'sage' | 'peach' | 'blush' | 'sky'
}) {
  const tones = {
    sage: 'bg-sage-50 text-sage-700',
    peach: 'bg-peach-100 text-peach-500',
    blush: 'bg-blush-100 text-blush-300',
    sky: 'bg-sky-100 text-sky-300',
  }
  return (
    <div className="card !p-3.5 flex-1">
      <div className="flex items-center gap-2 mb-1.5">
        {icon && (
          <span className={cx('grid place-items-center w-8 h-8 rounded-full', tones[tone])}>
            {icon}
          </span>
        )}
        <span className="text-sage-500 text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-sage-800 leading-tight">{value}</div>
      {sub && <div className="text-xs text-sage-400 mt-0.5">{sub}</div>}
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
    <div className="flex flex-col items-center text-center py-10 px-6">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-sage-50 text-sage-300 grid place-items-center mb-3">
          {icon}
        </div>
      )}
      <p className="text-sage-700 font-medium">{title}</p>
      {hint && <p className="text-sage-400 text-sm mt-1 max-w-[15rem]">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ============ شريط تقدّم ============
export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 rounded-full bg-sage-100 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-l from-sage-400 to-sage-300 transition-all"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  )
}

// ============ حلقة تقدّم ============
export function ProgressRing({
  value,
  size = 128,
  stroke = 10,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * Math.min(1, Math.max(0, value))
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#dcebdf" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#6b9e78"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

// ============ زر ============
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'peach'
}
export function Button({ variant = 'primary', className, ...rest }: BtnProps) {
  const cls =
    variant === 'ghost' ? 'btn-ghost' : variant === 'peach' ? 'btn-peach' : 'btn-primary'
  return <button className={cx(cls, className)} {...rest} />
}

// ============ زر عائم (FAB) ============
export function Fab({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label ?? 'إضافة'}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 btn bg-peach-400 text-white shadow-soft w-14 h-14 rounded-full hover:bg-peach-500"
      style={{ insetInlineStart: 'auto' }}
    >
      <PlusIcon />
    </button>
  )
}

// ============ نافذة سفلية (Bottom Sheet / Modal) ============
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-sage-900/40 animate-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-cream-50 rounded-t-3xl p-5 pb-8 shadow-2xl animate-in max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-sage-800">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 grid place-items-center rounded-full bg-sage-100 text-sage-500"
            aria-label="إغلاق"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ============ حقل إدخال بعنوان ============
export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block mb-3">
      <span className="block text-sm text-sage-600 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

// ============ اختيار مقسّم ============
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-sage-100 rounded-full p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-full py-2 text-sm font-medium transition',
            value === o.value ? 'bg-white text-sage-700 shadow-sm' : 'text-sage-500',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
