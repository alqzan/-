import { useEffect, useRef, useState } from 'react'
import { CloseIcon, MicIcon } from './icons'
import { Button, Field } from './ui'
import VoicePlayer from './VoicePlayer'
import {
  LONG_RECORDING_SECONDS,
  VoiceRecorder,
  formatClock,
  formatSize,
  isRecordingSupported,
} from '../lib/audio'
import { addVoice } from '../data/dataService'
import {
  blobToDataUrl,
  isMediaStoreSupported,
  newMediaKey,
  putAudio,
} from '../data/mediaStore'
import { localDateInputValue, localDateToIso } from '../lib/localDate'
import type { Parent } from '../data/types'

// =============================================================
// تسجيل رسالة صوتية — بلا سقف زمني.
//
// ثلاث حالات لا رابعة لها: قبل التسجيل، أثناءه، وبعده (معاينة قبل الحفظ).
// المعاينة مهمّة: الصوت لا يُراجَع بالنظر، فمن حقّ الأب أن يسمع نفسه
// قبل أن يحفظ رسالةً ستُسمع بعد عشرين سنة.
//
// الصوت يذهب إلى مخزن الوسائط لا إلى بيانات التطبيق، وحين يتعذّر ذلك
// (تصفّح خاص) نضمّنه داخل البيانات مع تنبيه صريح أن المساحة أضيق.
// =============================================================

export default function VoiceForm({
  author,
  authorPicker,
  onDone,
}: {
  author: Parent
  authorPicker: React.ReactNode
  onDone: (message: string) => void
}) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'ready'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [recording, setRecording] = useState<{ blob: Blob; durationSec: number } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(localDateInputValue())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const recorderRef = useRef<VoiceRecorder | null>(null)
  const tickRef = useRef<number | null>(null)

  const stopTicking = () => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  // الميكروفون يبقى مفتوحًا لو أُغلقت النافذة أثناء التسجيل — نغلقه دائمًا
  useEffect(
    () => () => {
      stopTicking()
      recorderRef.current?.dispose()
    },
    [],
  )

  // رابط المعاينة مورد يجب تحريره، وإلا بقي التسجيل في الذاكرة بعد إغلاق النافذة
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  if (!isRecordingSupported()) {
    return (
      <p className="text-[13px] text-ink-600 leading-relaxed bg-paper-100 border border-line rounded-2xl p-4">
        متصفّحكم ما يدعم التسجيل الصوتي. جرّبوا من متصفّح آخر، أو اكتبوا رسالة بدلًا منه.
      </p>
    )
  }

  async function start() {
    setError(null)
    const recorder = new VoiceRecorder()
    recorderRef.current = recorder
    try {
      await recorder.start()
    } catch {
      setError('ما قدرنا نوصل للميكروفون — تأكّدوا من السماح للتطبيق باستخدامه.')
      recorderRef.current = null
      return
    }
    setSeconds(0)
    setPhase('recording')
    tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
  }

  async function stop() {
    stopTicking()
    const recorder = recorderRef.current
    if (!recorder) return
    try {
      const result = await recorder.stop()
      setRecording(result)
      setPreviewUrl(URL.createObjectURL(result.blob))
      setPhase('ready')
    } catch {
      setError('تعذّر حفظ التسجيل. جرّبوا مرة ثانية.')
      setPhase('idle')
    } finally {
      recorderRef.current = null
    }
  }

  function discard() {
    setRecording(null)
    setPreviewUrl(null)
    setSeconds(0)
    setPhase('idle')
  }

  async function save() {
    if (!recording) return
    setBusy(true)

    // المسار الاعتيادي: الصوت في مخزن الوسائط، والبيانات تحمل مفتاحه فقط
    let localKey: string | undefined
    let dataUrl: string | undefined
    if (isMediaStoreSupported()) {
      try {
        localKey = newMediaKey()
        await putAudio(localKey, recording.blob)
      } catch {
        localKey = undefined
      }
    }
    if (!localKey) {
      try {
        dataUrl = await blobToDataUrl(recording.blob)
      } catch {
        setBusy(false)
        setError('تعذّر حفظ التسجيل على هذا الجهاز.')
        return
      }
    }

    const ok = await addVoice({
      localKey,
      dataUrl,
      durationSec: recording.durationSec,
      title: title.trim() || undefined,
      date: localDateToIso(date),
      author,
    })
    setBusy(false)
    if (ok) onDone('حُفظت الرسالة الصوتية')
    else setError('المساحة على الجهاز ممتلئة — احذفوا صورًا أو تسجيلات، أو خذوا نسخة احتياطية.')
  }

  const long = seconds >= LONG_RECORDING_SECONDS

  return (
    <div>
      {phase === 'idle' && (
        <div className="text-center py-4">
          <button
            onClick={() => void start()}
            className="w-24 h-24 rounded-full bg-clay-500 text-white grid place-items-center mx-auto
                       shadow-lift transition active:scale-90 hover:bg-clay-600"
            aria-label="ابدأوا التسجيل"
          >
            <MicIcon className="w-9 h-9" />
          </button>
          <p className="font-display font-bold text-ink-900 mt-5">سجّلوا صوتكم له</p>
          <p className="text-[13px] text-ink-400 mt-1.5 leading-relaxed max-w-[18rem] mx-auto">
            كلمة، أو دعوة، أو أغنية تهدّيه. سجّلوا كما تحبّون — بلا حدّ للمدة.
          </p>
        </div>
      )}

      {phase === 'recording' && (
        <div className="text-center py-4">
          <button
            onClick={() => void stop()}
            className="relative w-24 h-24 rounded-full bg-clay-600 text-white grid place-items-center mx-auto
                       shadow-lift transition active:scale-90"
            aria-label="إيقاف التسجيل"
          >
            {/* نبضة حيّة: الدليل الوحيد المرئي أن الصوت يُسجَّل فعلًا */}
            <span className="absolute inset-0 rounded-full bg-clay-500/40 animate-ping" />
            <span className="relative w-7 h-7 rounded-md bg-white" />
          </button>
          <p className="font-display font-bold text-[26px] text-ink-900 mt-5 tnum">
            {formatClock(seconds)}
          </p>
          <p className="text-[12px] text-ink-400 mt-1">اضغطوا للإيقاف</p>
          {long && (
            <p className="text-[12px] text-brass-600 mt-3 leading-relaxed max-w-[18rem] mx-auto">
              تسجيل طويل — سيُحفظ كاملًا، لكن انتبهوا لمساحة الجهاز.
            </p>
          )}
        </div>
      )}

      {phase === 'ready' && recording && previewUrl && (
        <>
          <div className="card !bg-paper-100 mb-5 flex items-center gap-3">
            <VoicePlayer
              className="flex-1"
              src={previewUrl}
              durationSec={recording.durationSec}
            />
            <button
              onClick={discard}
              className="w-9 h-9 grid place-items-center rounded-full bg-white border border-line text-ink-500 shrink-0"
              aria-label="حذف التسجيل وإعادة المحاولة"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[12px] text-ink-400 mb-4 tnum">
            المدة {formatClock(recording.durationSec)} • الحجم {formatSize(recording.blob.size)}
          </p>

          <Field label="عنوان (اختياري)">
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلًا: أول أغنية غنيناها لك"
            />
          </Field>
          <Field label="التاريخ">
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          {authorPicker}
        </>
      )}

      {error && <p className="text-clay-600 text-sm mt-3 leading-relaxed">{error}</p>}

      {phase === 'ready' && recording && (
        <Button className="w-full mt-2" disabled={busy} onClick={() => void save()}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ التسجيل'}
        </Button>
      )}
    </div>
  )
}
