// =============================================================
// تسجيل الصوت — غلاف رقيق حول MediaRecorder.
//
// الغرض: تبقى الواجهة جاهلة بفروق المتصفحات (Safari لا يدعم webm/opus،
// وأسماء الأنواع تختلف)، وتبقى المدة والحجم تحت السيطرة لأن التخزين
// المحلي محدود ونحن نضع صوتًا بجانب صور المستخدم.
// =============================================================

/** أقصى مدة للتسجيل — رسالة قصيرة تُسمع، لا محاضرة تملأ التخزين */
export const MAX_VOICE_SECONDS = 90

/** جودة كافية للصوت البشري وبثلث حجم الافتراضي */
const AUDIO_BITS_PER_SECOND = 32000

const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
]

export function isRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t))
}

export interface Recording {
  dataUrl: string
  durationSec: number
}

export type RecorderState = 'idle' | 'recording' | 'stopped'

/**
 * جلسة تسجيل واحدة. تُنشأ عند الضغط على «سجّلوا» وتُرمى بعد الحفظ.
 *
 * مسؤولية المستدعي: استدعاء `dispose()` في كل الحالات — بدونها يبقى
 * مؤشّر الميكروفون مضاءً في المتصفح بعد إغلاق النافذة.
 */
export class VoiceRecorder {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: BlobPart[] = []
  private startedAt = 0
  private stoppedAt = 0

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickMimeType()
    this.recorder = new MediaRecorder(
      this.stream,
      mimeType ? { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND } : undefined,
    )
    this.chunks = []
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.startedAt = Date.now()
    this.recorder.start()
  }

  /** يوقف التسجيل ويرجع الصوت جاهزًا للحفظ */
  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder
      if (!recorder) {
        reject(new Error('لا يوجد تسجيل جارٍ'))
        return
      }
      recorder.onstop = () => {
        this.stoppedAt = Date.now()
        const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' })
        const reader = new FileReader()
        reader.onload = () =>
          resolve({
            dataUrl: reader.result as string,
            durationSec: Math.max(1, Math.round((this.stoppedAt - this.startedAt) / 1000)),
          })
        reader.onerror = () => reject(new Error('تعذّرت قراءة التسجيل'))
        reader.readAsDataURL(blob)
      }
      recorder.stop()
      this.releaseMic()
    })
  }

  /** يوقف كل شيء دون حفظ — للإلغاء أو الخروج */
  dispose(): void {
    try {
      if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.onstop = null
        this.recorder.stop()
      }
    } catch {
      /* المسجّل أُغلق مسبقًا */
    }
    this.releaseMic()
    this.recorder = null
    this.chunks = []
  }

  private releaseMic(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }
}

/** «١:٠٥» — تنسيق مدة الصوت */
export function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = Math.floor(totalSec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** حجم تقريبي لتسجيل مخزَّن كـ Data URL */
export function voiceBytes(voice: { dataUrl?: string }): number {
  return (voice.dataUrl?.length ?? 0) * 2
}
