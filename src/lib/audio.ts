// =============================================================
// تسجيل الصوت — غلاف رقيق حول MediaRecorder.
//
// الغرض: تبقى الواجهة جاهلة بفروق المتصفحات (Safari لا يدعم webm/opus،
// وأسماء الأنواع تختلف).
//
// لا سقف زمني للتسجيل: الصوت يُحفظ في مخزن الوسائط (IndexedDB) لا داخل
// بيانات التطبيق، فحدّه هو مساحة الجهاز لا حصّة localStorage الضيّقة.
// =============================================================

/** جودة كافية للصوت البشري وبثلث حجم الافتراضي — تُطيل الممكن قبل امتلاء الجهاز */
const AUDIO_BITS_PER_SECOND = 32000

/** بعد هذه المدة نُنبّه أن التسجيل صار طويلًا (بلا إيقافه) */
export const LONG_RECORDING_SECONDS = 5 * 60

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
  /** التسجيل الخام — يُخزَّن كما هو بلا تضخّم base64 */
  blob: Blob
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
        // الميكروفون يُغلق هنا لا قبل: إنهاء مسار الصوت قبل أن يُخرج
        // المسجّل آخر قطعة يقصّ أواخر الجملة على بعض المتصفحات (سفاري).
        this.releaseMic()
        resolve({
          blob: new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' }),
          durationSec: Math.max(1, Math.round((this.stoppedAt - this.startedAt) / 1000)),
        })
      }
      recorder.onerror = () => {
        this.releaseMic()
        reject(new Error('توقّف التسجيل بخطأ'))
      }
      recorder.stop()
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

/** حجم التسجيلات المضمّنة داخل البيانات (البديل حين يتعذّر مخزن الوسائط) */
export function inlineVoiceBytes(voice: { dataUrl?: string }): number {
  return (voice.dataUrl?.length ?? 0) * 2
}

/** «١٢٫٤ م.ب» — حجم مقروء */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} ك.ب`
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`
}
