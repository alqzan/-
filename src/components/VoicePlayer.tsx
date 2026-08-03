import { useEffect, useRef, useState } from 'react'
import { PauseIcon, PlayIcon } from './icons'
import { cx } from './ui'
import { formatClock } from '../lib/audio'
import type { VoiceNote } from '../data/types'

/** مصدر تشغيل التسجيل — محليًا Data URL، وبعد Firebase رابط تنزيل */
export function voiceSrc(voice: Pick<VoiceNote, 'dataUrl' | 'remoteUrl'>): string {
  return voice.dataUrl ?? voice.remoteUrl ?? ''
}

/**
 * مشغّل صغير بزرّ واحد وشريط تقدّم.
 *
 * لا نستخدم `<audio controls>`: شكله يختلف جذريًا بين المتصفحات ويكسر
 * هوية الصفحة، وهو أعرض من أن يوضع داخل بطاقة في خيط الحكاية.
 */
export default function VoicePlayer({
  voice,
  className,
}: {
  voice: VoiceNote
  className?: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)

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

  const total = voice.durationSec || 1
  const ratio = Math.min(1, elapsed / total)

  return (
    <div className={cx('flex items-center gap-3', className)}>
      {/* preload="none": عشرات التسجيلات في الحكاية لا يصحّ تحميلها كلها */}
      <audio ref={audioRef} src={voiceSrc(voice)} preload="none" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          const audio = audioRef.current
          if (!audio) return
          if (playing) {
            audio.pause()
            setPlaying(false)
          } else {
            void audio.play()
            setPlaying(true)
          }
        }}
        aria-label={playing ? 'إيقاف' : 'تشغيل'}
        className="w-11 h-11 rounded-full bg-clay-500 text-white grid place-items-center shrink-0
                   transition active:scale-90 hover:bg-clay-600"
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
          {formatClock(playing || elapsed > 0 ? elapsed : total)}
        </div>
      </div>
    </div>
  )
}
