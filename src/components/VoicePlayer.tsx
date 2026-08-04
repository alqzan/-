import { useEffect, useRef, useState } from 'react'
import { PauseIcon, PlayIcon } from './icons'
import { cx } from './ui'
import { formatClock } from '../lib/audio'
import { getAudio } from '../data/mediaStore'
import type { VoiceNote } from '../data/types'

/**
 * مشغّل صغير بزرّ واحد وشريط تقدّم.
 *
 * لا نستخدم `<audio controls>`: شكله يختلف جذريًا بين المتصفحات ويكسر
 * هوية الصفحة، وهو أعرض من أن يوضع داخل بطاقة في خيط الحكاية.
 *
 * يقبل إمّا تسجيلًا محفوظًا (`voice`) فيجلب صوته من مخزن الوسائط عند أول
 * تشغيل، أو مصدرًا جاهزًا (`src`) كما في معاينة ما قبل الحفظ.
 */
export default function VoicePlayer({
  voice,
  src,
  durationSec,
  className,
}: {
  voice?: VoiceNote
  src?: string
  durationSec?: number
  className?: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const total = durationSec ?? voice?.durationSec ?? 1

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setElapsed(audio.currentTime)
    const onEnd = () => {
      setPlaying(false)
      setElapsed(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.pause()
    }
  }, [])

  // رابط الكائن مورد يُحرَّر عند إزالة المكوّن، وإلا بقي التسجيل في الذاكرة
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    [],
  )

  /**
   * لا نحمّل الصوت إلا عند أول تشغيل: خيط الحكاية قد يحمل عشرات
   * التسجيلات، وجلبها كلها عند فتح الشاشة إهدار للذاكرة وللبطارية.
   */
  async function resolveSrc(): Promise<string | null> {
    if (src) return src
    if (voice?.dataUrl) return voice.dataUrl
    if (voice?.remoteUrl) return voice.remoteUrl
    if (!voice?.localKey) return null
    if (objectUrlRef.current) return objectUrlRef.current

    setLoading(true)
    const blob = await getAudio(voice.localKey)
    setLoading(false)
    if (!blob) {
      setFailed(true)
      return null
    }
    objectUrlRef.current = URL.createObjectURL(blob)
    return objectUrlRef.current
  }

  async function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    if (!audio.src) {
      const resolved = await resolveSrc()
      if (!resolved) return
      audio.src = resolved
    }
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setFailed(true)
    }
  }

  const ratio = Math.min(1, elapsed / total)

  return (
    <div className={cx('flex items-center gap-3', className)}>
      <audio ref={audioRef} preload="none" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void toggle()
        }}
        disabled={failed}
        aria-label={playing ? 'إيقاف' : 'تشغيل'}
        className="w-11 h-11 rounded-full bg-clay-500 text-white grid place-items-center shrink-0
                   transition active:scale-90 hover:bg-clay-600 disabled:opacity-40"
      >
        {playing ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full bg-paper-300 overflow-hidden">
          <div
            className="h-full rounded-full bg-clay-500 transition-[width] duration-200"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <div className="text-[11px] text-ink-400 mt-1.5 tnum">
          {failed
            ? 'تعذّر تشغيل التسجيل'
            : loading
              ? 'جارٍ التحميل…'
              : formatClock(playing || elapsed > 0 ? elapsed : total)}
        </div>
      </div>
    </div>
  )
}
