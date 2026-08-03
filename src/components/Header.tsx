import { useNavigate } from 'react-router-dom'
import { BackIcon } from './icons'
import type { ReactNode } from 'react'

/**
 * ترويسة موحّدة لكل شاشة داخلية: زر رجوع ثابت المكان، عنوان بخط العناوين،
 * وسطر شرح اختياري. توحيدها هو ما يجعل التنقّل متوقَّعًا في التطبيق كله.
 */
export function ScreenHeader({
  title,
  subtitle,
  back = true,
  action,
}: {
  title: string
  subtitle?: string
  back?: boolean
  action?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="flex items-start gap-3 pt-5 pb-5 print:hidden">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="btn-icon shrink-0 mt-0.5"
          aria-label="رجوع"
        >
          <BackIcon className="w-5 h-5" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="title-md truncate">{title}</h1>
        {subtitle && <p className="text-[13px] text-ink-400 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
