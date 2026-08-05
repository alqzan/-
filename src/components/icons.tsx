import type { SVGProps } from 'react'

// =============================================================
// مجموعة أيقونات خطّية مرسومة لهذا التطبيق وحده:
// شبكة 24، سماكة 1.6، نهايات دائرية، وأقل عدد ممكن من الخطوط.
// لا إيموجي في الواجهة — الرسم وحده يحمل المعنى.
// =============================================================
type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

// ===== التنقّل =====

/** اليوم — شمس بأشعّة قصيرة */
export const TodayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2.2M12 18.8V21M4.2 12H2M22 12h-2.2M6.3 6.3 4.8 4.8M19.2 19.2l-1.5-1.5M17.7 6.3l1.5-1.5M4.8 19.2l1.5-1.5" />
  </svg>
)

/** الحكاية — كتاب مفتوح بخيط */
export const StoryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 7.2C10.4 5.6 8.2 5 4.5 5v12.5c3.7 0 5.9.6 7.5 2.2 1.6-1.6 3.8-2.2 7.5-2.2V5c-3.7 0-5.9.6-7.5 2.2Z" />
    <path d="M12 7.2v12.5" />
  </svg>
)

/** المتابعة — نبضة داخل دائرة */
export const TrackIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M7.5 12h2l1.5-3 2 6 1.5-3h2" />
  </svg>
)

export const HomeIcon = TodayIcon

// ===== التوثيق =====

/** صورة — إطار بجبل وشمس */
export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4.5 17 4.2-4.2a2 2 0 0 1 2.8 0L16 17.5M14.5 14l1.3-1.3a2 2 0 0 1 2.8 0l1.9 1.9" />
  </svg>
)

/** كاميرا */
export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8h3l1.4-2h7.2L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13" r="3.1" />
  </svg>
)

/** رسالة — قلم ريشة */
export const FeatherIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 4c-6.5-.5-11 3-12.5 7.5L5.5 18M4 20l3-2.5" />
    <path d="M20 4c.5 6.5-3 11-7.5 12.5l-4 .5" />
    <path d="M14.5 9.5 10 14" />
  </svg>
)

/** ظرف — يستخدم لبطاقات الرسائل */
export const LetterIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.8 7 7.1 5.4a2 2 0 0 0 2.4 0L20.3 7" />
  </svg>
)

/** معلم — نجمة سداسية ناعمة */
export const StarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.2c.6 3.6 1.6 4.6 5.2 5.2-3.6.6-4.6 1.6-5.2 5.2-.6-3.6-1.6-4.6-5.2-5.2 3.6-.6 4.6-1.6 5.2-5.2Z" />
    <path d="M17.5 15c.3 1.8.8 2.3 2.6 2.6-1.8.3-2.3.8-2.6 2.6-.3-1.8-.8-2.3-2.6-2.6 1.8-.3 2.3-.8 2.6-2.6Z" />
  </svg>
)

/** كبسولة زمنية — ساعة رملية */
export const CapsuleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.5 3h11M6.5 21h11" />
    <path d="M8 3v3.2c0 2 4 3.8 4 5.8s-4 3.8-4 5.8V21M16 3v3.2c0 2-4 3.8-4 5.8s4 3.8 4 5.8V21" />
  </svg>
)

/** قفل — للكبسولة المقفلة */
export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
)

/** علامة اقتباس — لبطاقات الرسائل في الكتاب */
export const QuoteIcon = (p: IconProps) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
    <path d="M9.6 6C6.5 7.3 4.6 10 4.6 13.2c0 2.8 1.6 4.8 3.9 4.8 1.9 0 3.3-1.4 3.3-3.2 0-1.8-1.2-3.1-2.9-3.1-.3 0-.7 0-1 .2.4-1.6 1.6-3 3.2-3.9L9.6 6Zm8.4 0c-3.1 1.3-5 4-5 7.2 0 2.8 1.6 4.8 3.9 4.8 1.9 0 3.3-1.4 3.3-3.2 0-1.8-1.2-3.1-2.9-3.1-.3 0-.7 0-1 .2.4-1.6 1.6-3 3.2-3.9L18 6Z" />
  </svg>
)

/** ميكروفون — الرسالة الصوتية */
export const MicIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <path d="M12 18v3.5M9 21.5h6" />
  </svg>
)

/** تشغيل */
export const PlayIcon = (p: IconProps) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'currentColor' })}>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
)

/** إيقاف مؤقّت */
export const PauseIcon = (p: IconProps) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'currentColor' })}>
    <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
    <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
  </svg>
)

/** مشاركة */
export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 15.5V3.5M8 7l4-3.5L16 7" />
    <path d="M5 13v6.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V13" />
  </svg>
)

// ===== المتابعة =====

/** ركلة — قدم صغيرة */
export const FootIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 13.2c0-3 1-8.2 4-8.2s3 4 2 7c-.6 1.8-.3 3 .6 4.2.9 1.2.5 2.8-1 3.3-1.8.6-4 .2-5-1.4-.8-1.3-.6-2.7-.6-4.9Z" />
    <circle cx="16.2" cy="7.4" r=".95" fill="currentColor" stroke="none" />
    <circle cx="17.6" cy="10" r=".95" fill="currentColor" stroke="none" />
    <circle cx="17.6" cy="12.6" r=".95" fill="currentColor" stroke="none" />
  </svg>
)

/** انقباضة — موجة */
export const WaveIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 15c2.5 0 2.5-6 5-6s2.5 6 5 6 2.5-6 5-6 2.5 3 3 3" />
  </svg>
)

export const PulseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
)

/** رضاعة */
export const BottleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 2.5h4M11 2.5v2.2M13 2.5v2.2" />
    <path d="M9 6.6c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6 0 1 .8 1.4.8 3v9.9a1.5 1.5 0 0 1-1.5 1.5H9.7a1.5 1.5 0 0 1-1.5-1.5V9.6c0-1.6.8-2 .8-3Z" />
    <path d="M8.5 11.5h4M8.5 14h4" />
  </svg>
)

/** حفاض — قطرة */
export const DropIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.2s6 6.6 6 10.4A6 6 0 0 1 6 13.6C6 9.8 12 3.2 12 3.2Z" />
  </svg>
)

/** نوم */
export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 14.6A8 8 0 1 1 9.4 4a6.5 6.5 0 0 0 10.6 10.6Z" />
  </svg>
)

/** نمو — مسطرة */
export const RulerIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2.5" y="8.5" width="19" height="7" rx="1.8" />
    <path d="M6.5 8.5v2.6M10 8.5v3.6M13.5 8.5v2.6M17 8.5v3.6" />
  </svg>
)

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4v16h16" />
    <path d="m8 15 3-4 3 2 4-6" />
  </svg>
)

/** تطعيم */
export const SyringeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m14 4 6 6M18 6l-2 2M16 8l-8 8-4 1 1-4 8-8M9 11l2 2M6.5 13.5 8 15" />
  </svg>
)

/** أم — قلب داخل دائرة */
export const MomIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 16.4s-3.6-2.3-3.6-4.9a1.95 1.95 0 0 1 3.6-1.1 1.95 1.95 0 0 1 3.6 1.1c0 2.6-3.6 4.9-3.6 4.9Z" />
  </svg>
)

/** بطن الحمل */
export const BellyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 3c-.5 2 .3 3.4 1 4.2" />
    <path d="M13 7.2C17 8 20 11 20 15a6 6 0 0 1-6 6H10a4 4 0 0 1-4-4c0-3 2-4 2-6 0-2 2-4 5-3.8Z" />
    <circle cx="15.4" cy="15" r="1" fill="currentColor" stroke="none" />
  </svg>
)

/** مولود — رأس صغير */
export const BabyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="11" r="7.5" />
    <path d="M9.5 10.2h.01M14.5 10.2h.01" />
    <path d="M9.8 14c1.3 1.2 3.1 1.2 4.4 0" />
    <path d="M12 3.5c1.6 0 2.4.6 2.4.6" />
  </svg>
)

// ===== التجهيزات =====

export const BagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 8h12l1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
)

/** اسم — بطاقة */
export const TagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11.4 3.6H5.5a2 2 0 0 0-2 2v5.9c0 .5.2 1 .6 1.4l7 7a2 2 0 0 0 2.8 0l5.9-5.9a2 2 0 0 0 0-2.8l-7-7a2 2 0 0 0-1.4-.6Z" />
    <circle cx="8.3" cy="8.3" r="1.3" />
  </svg>
)

/** قائمة مهام */
export const ListIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <path d="m4 6.2.9.9L7 5M4 11.7l.9.9L7 10.5M4 17.2l.9.9L7 16" />
  </svg>
)

// ===== عامة =====

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
)

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
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
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

/** سهم «رجوع» في واجهة RTL: يشير إلى اليمين */
export const BackIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 6.5 15 12l-6 5.5" />
  </svg>
)

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m14 6-6 6 6 6" />
  </svg>
)

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9.5 6 6 6-6" />
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

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l1.7-1.3-2-3.4-2 .8a7.7 7.7 0 0 0-2.6-1.5L14.2 3H9.8l-.3 2.1a7.7 7.7 0 0 0-2.6 1.5l-2-.8-2 3.4 1.7 1.3a7.7 7.7 0 0 0 0 3l-1.7 1.3 2 3.4 2-.8a7.7 7.7 0 0 0 2.6 1.5l.3 2.1h4.4l.3-2.1a7.7 7.7 0 0 0 2.6-1.5l2 .8 2-3.4-1.7-1.3Z" />
  </svg>
)

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
)

export const EditIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 6.5 3 3" />
  </svg>
)

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
)

export const UploadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
)

export const PrintIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 9V4h10v5" />
    <path d="M5 9h14a2 2 0 0 1 2 2v5h-4v4H7v-4H3v-5a2 2 0 0 1 2-2Z" />
    <path d="M7 14h10" />
  </svg>
)

export const BookIcon = StoryIcon
export const BookOpenIcon = StoryIcon

export const SparkleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.5c.7 4 1.8 5.1 5.8 5.8-4 .7-5.1 1.8-5.8 5.8-.7-4-1.8-5.1-5.8-5.8 4-.7 5.1-1.8 5.8-5.8Z" />
    <path d="M17.8 16c.3 1.6.7 2 2.2 2.3-1.5.3-2 .7-2.2 2.3-.3-1.6-.7-2-2.2-2.3 1.5-.3 2-.7 2.2-2.3Z" />
  </svg>
)

/** أرشيف/نسخة احتياطية */
export const ArchiveIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="4.5" rx="1.5" />
    <path d="M5 9v9.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
    <path d="M10 13h4" />
  </svg>
)
