import { useCallback, useSyncExternalStore } from 'react'

// ============================================================
// ساعة مشتركة.
//
// لماذا لا نكتب `Date.now()` أثناء التصيير؟ لأنه غير نقي: أي إعادة
// تصيير لسبب آخر تعطي رقمًا مختلفًا، فتتغيّر الأرقام المعروضة بلا سبب
// ظاهر ويصعب اختبار المكوّن.
//
// الحل: الوقت **مصدر خارجي** يعيش خارج شجرة React. كل مكوّنات الإيقاع
// نفسه تشترك في مؤقّت واحد، فعشر بطاقات تعرض «قبل دقيقتين» لا تُشغّل
// عشرة مؤقّتات — بل واحدًا.
// ============================================================

interface Clock {
  now: number
  listeners: Set<() => void>
  timer: ReturnType<typeof setInterval> | null
}

/** مفتاح الساعة الساكنة (بلا نبض) */
const FROZEN = -1

const clocks = new Map<number, Clock>()

function getClock(key: number): Clock {
  let clock = clocks.get(key)
  if (!clock) {
    clock = { now: Date.now(), listeners: new Set(), timer: null }
    clocks.set(key, clock)
  }
  return clock
}

function subscribeToClock(key: number, listener: () => void): () => void {
  const clock = getClock(key)
  clock.listeners.add(listener)

  // أول مشترك: نلتقط الوقت الحالي ونشغّل النبض
  if (clock.listeners.size === 1) {
    clock.now = Date.now()
    if (key !== FROZEN) {
      clock.timer = setInterval(() => {
        clock.now = Date.now()
        clock.listeners.forEach((l) => l())
      }, key)
    }
  }
  listener()

  return () => {
    clock.listeners.delete(listener)
    // آخر مشترك غادر: نوقف المؤقّت بدل إبقاء الجهاز مستيقظًا بلا داعٍ
    if (clock.listeners.size === 0 && clock.timer !== null) {
      clearInterval(clock.timer)
      clock.timer = null
    }
  }
}

/**
 * وقتٌ حيّ يتحدّث كل `intervalMs`.
 *
 * مرّر `null` لتجميد الوقت حين لا توجد جلسة نشطة — القيمة تبقى صالحة
 * لكن بلا مؤقّت يعمل في الخلفية.
 */
export function useNow(intervalMs: number | null = 1000): number {
  const key = intervalMs ?? FROZEN

  const subscribe = useCallback(
    (listener: () => void) => subscribeToClock(key, listener),
    [key],
  )
  const read = useCallback(() => getClock(key).now, [key])

  return useSyncExternalStore(subscribe, read, read)
}
