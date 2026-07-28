import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from './icons'
import type { ReactNode } from 'react'

export function ScreenHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string
  subtitle?: string
  back?: boolean
  action?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center gap-3 pt-4 pb-3 px-1">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 grid place-items-center rounded-full bg-white shadow-card text-sage-600 shrink-0"
          aria-label="رجوع"
        >
          {/* في RTL يشير السهم لليمين تلقائيًا عبر التدوير */}
          <ChevronLeftIcon className="w-5 h-5 rotate-180" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-sage-800 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-sage-400 truncate">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
