// =============================================================
// رسوم خطّية مرسومة خصيصًا للتطبيق — بديل الإيموجي.
// كلها بنفس لغة الأيقونات: خط واحد، نهايات دائرية، بلا تعبئة.
// =============================================================

/**
 * رسمة الجنين: طفل ملتفّ يكبر مع الأسابيع.
 * الحجم النسبي يتغيّر فعلًا مع الأسبوع (٤ → ٤٠) فتُرى الرحلة بالعين.
 */
export function FetalFigure({
  week,
  className,
  stroke = 2.4,
}: {
  week: number
  className?: string
  stroke?: number
}) {
  const w = Math.max(4, Math.min(40, week))
  // من 0.42 في الأسبوع الرابع إلى 1 عند الأربعين
  const scale = 0.42 + ((w - 4) / 36) * 0.58

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <g
        transform={`translate(50 52) scale(${scale.toFixed(3)}) translate(-50 -52)`}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* الرأس */}
        <circle cx="60" cy="33" r="17" />
        {/* الظهر: قوس واسع يلتفّ حتى الوركين */}
        <path d="M45 42C29 49 22 69 33 82c8 9 22 10 30 3" />
        {/* الصدر والبطن — يغلق الشكل فيُقرأ جسدًا لا خطًّا */}
        <path d="M55 49c-6 8-6 17 0 24" />
        {/* الذراع مطويّة نحو الوجه */}
        <path d="M50 53c-8 3-10 12-4 17" />
        {/* الساق مطويّة */}
        <path d="M58 74c-8 3-11 12-5 18" />
        {/* ملامح خفيفة */}
        <circle cx="67" cy="30" r="1.3" fill="currentColor" stroke="none" />
        <path d="M67 39c1.8 1.5 4 1.4 5.5-.2" opacity="0.7" />
      </g>
    </svg>
  )
}

/**
 * حرف أوّل من الاسم داخل دائرة — بديل صورة الطفل قبل رفعها.
 */
export function Monogram({
  name,
  className = 'w-14 h-14',
}: {
  name: string
  className?: string
}) {
  const letter = (name ?? '').trim().charAt(0) || '؟'
  return (
    <span
      className={`grid place-items-center rounded-full bg-paper-200 border border-line text-ink-700 font-display font-bold ${className}`}
      aria-hidden="true"
    >
      {letter}
    </span>
  )
}

/**
 * زخرفة الغلاف: قوسان متداخلان يوحيان بـ«حضن».
 * تُستخدم في شاشة البداية وغلاف كتاب الذكريات.
 */
export function EmbraceMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10 70c0-28 22-50 50-50s50 22 50 50" />
        <path d="M28 70c0-18 14-32 32-32s32 14 32 32" opacity="0.6" />
        <path d="M46 70c0-8 6-14 14-14s14 6 14 14" opacity="0.35" />
      </g>
    </svg>
  )
}
