import { NavLink } from 'react-router-dom'
import { BagIcon, BellyIcon, HeartIcon, HomeIcon } from './icons'
import { cx } from './ui'

const items = [
  { to: '/', label: 'الرئيسية', Icon: HomeIcon, end: true },
  { to: '/pregnancy', label: 'الحمل', Icon: BellyIcon },
  { to: '/memories', label: 'الذكريات', Icon: HeartIcon },
  { to: '/prep', label: 'التجهيزات', Icon: BagIcon },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 pointer-events-none">
      <div className="mx-auto max-w-md pointer-events-auto">
        <div className="bg-white/95 backdrop-blur border-t border-cream-200 px-2 pb-[env(safe-area-inset-bottom)]">
          <ul className="flex items-stretch justify-around">
            {items.map(({ to, label, Icon, end }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cx(
                      'flex flex-col items-center gap-1 py-2.5 text-xs transition-colors',
                      isActive ? 'text-sage-500' : 'text-sage-300',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cx(
                          'grid place-items-center w-11 h-8 rounded-full transition-colors',
                          isActive && 'bg-sage-100',
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </span>
                      <span className={cx(isActive && 'font-bold')}>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}
