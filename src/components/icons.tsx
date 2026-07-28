import type { SVGProps } from 'react'

// أيقونات خطّية بسيطة (stroke) — تأخذ className للحجم واللون.
type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
)

export const BellyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 3c-.5 2 .3 3.4 1 4.2" />
    <path d="M13 7.2C17 8 20 11 20 15a6 6 0 0 1-6 6H10a4 4 0 0 1-4-4c0-3 2-4 2-6 0-2 2-4 5-3.8Z" />
    <circle cx="15.5" cy="15" r="1.1" fill="currentColor" stroke="none" />
  </svg>
)

export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7-2.5C19 10.5 12 20 12 20Z" />
  </svg>
)

export const HeartFillIcon = (p: IconProps) => (
  <svg {...base({ ...p, fill: 'currentColor' })}>
    <path d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7-2.5C19 10.5 12 20 12 20Z" />
  </svg>
)

export const BagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 8h12l1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
)

export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
)

export const BookIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5V5.5Z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5V5.5Z" />
  </svg>
)

export const CapsuleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="7" width="16" height="13" rx="2" />
    <path d="M3 7h18M9 4h6l1 3H8l1-3Z" />
    <path d="M12 11v5M9.5 13.5h5" />
  </svg>
)

export const StarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 3 2.5 5.3 5.5.8-4 4 1 5.6L12 21l-5-2.7 1-5.6-4-4 5.5-.8L12 3Z" />
  </svg>
)

export const FootIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 13c0-3 1-8 4-8s3 4 2 7c-.6 1.8-.3 3 .6 4.2.9 1.2.5 2.8-1 3.3-1.8.6-4 .2-5-1.4-.8-1.3-.6-2.7-.6-5.1Z" />
    <circle cx="16" cy="7.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const PulseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
)

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M4 9h16M8 3v4M16 3v4" />
  </svg>
)

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
)

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
)

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m14 6-6 6 6 6" />
  </svg>
)

export const BottleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 2h4M11 2v2.5M13 2v2.5" />
    <path d="M9 6.5c0-.8.7-1.5 1.5-1.5h3c.8 0 1.5.7 1.5 1.5 0 1 .8 1.4.8 3V20a1 1 0 0 1-1 1H9.2a1 1 0 0 1-1-1V9.5c0-1.6.8-2 .8-3Z" />
    <path d="M9 11h4M9 13.5h4" />
  </svg>
)

export const DropIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3Z" />
  </svg>
)

export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
)

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4v16h16" />
    <path d="M8 15l3-4 3 2 4-6" />
  </svg>
)

export const SyringeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m14 4 6 6M18 6l-2 2M16 8l-8 8-4 1 1-4 8-8M9 11l2 2M6.5 13.5l1.5 1.5" />
  </svg>
)

export const SparkleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M8.5 8.5 12 12l3.5-3.5M15.5 15.5 12 12l-3.5 3.5" />
  </svg>
)
