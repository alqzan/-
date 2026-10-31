import { NavLink, useLocation } from 'react-router-dom'
import { PlusIcon, StoryIcon, TrackIcon } from './icons'
import { cx } from './ui'
import { useCapture } from './Capture'

type IconComponent = (p: { className?: string }) => JSX.Element

export default function BottomNav() {
  const { open } = useCapture()
  const { pathname } = useLocation()
  const followupTo = pathname === '/' || pathname === '/today' ? '/' : '/track'

  return (
    <nav aria-label="التنقّل الرئيسي" className="fixed bottom-0 inset-x-0 z-30 pointer-events-none print:hidden">
      <div className="mx-auto max-w-[30rem] pointer-events-auto">
        <div className="bg-paper-50/95 backdrop-blur border-t border-line px-1 safe-bottom safe-inline">
          <ul className="flex items-stretch">
            <NavItem to={followupTo} label="المتابعة" Icon={TrackIcon} end={followupTo === '/'} />

            <li className="w-16 shrink-0 relative">
              <button
                type="button"
                onClick={() => open()}
                aria-label="توثيق لحظة"
                className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full
                           bg-clay-500 text-white shadow-lift grid place-items-center
                           ring-4 ring-paper-50 transition duration-200 ease-smooth
                           active:scale-90 hover:bg-clay-600"
              >
                <PlusIcon className="w-6 h-6" />
              </button>
            </li>

            <NavItem to="/story" label="الذكريات" Icon={StoryIcon} end={false} />
          </ul>
        </div>
      </div>
    </nav>
  )
}

function NavItem({
  to,
  label,
  Icon,
  end,
}: {
  to: string
  label: string
  Icon: IconComponent
  end: boolean
}) {
  return (
    <li className="flex-1">
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cx(
            'flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] transition-colors duration-200',
            isActive ? 'text-ink-900' : 'text-ink-300',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon className="w-[22px] h-[22px]" />
            <span className={cx(isActive && 'font-bold')}>{label}</span>
            <span
              className={cx(
                'h-[3px] w-4 rounded-full transition-colors duration-200',
                isActive ? 'bg-clay-500' : 'bg-transparent',
              )}
            />
          </>
        )}
      </NavLink>
    </li>
  )
}
