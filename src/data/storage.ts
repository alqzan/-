import type { AppData } from './types'
import { migrate } from './migrate'

// ============================================================
// واجهة التخزين — نقطة الوصل الوحيدة مع العالم الخارجي.
//
// التطبيق كله (الشاشات + dataService) لا يعرف شيئًا عن localStorage.
// عند ربط Firebase نكتب `FirestoreAdapter` يحقّق نفس الواجهة ونبدّله
// في `dataService.ts` بسطر واحد — دون لمس أي شاشة.
//
// لذلك كل العمليات هنا **غير متزامنة** رغم أن التخزين المحلي متزامن:
// التوقيع هو ما يهمّ، وتغييره لاحقًا أصعب بكثير من تحمّله الآن.
// ============================================================

export interface StorageUsage {
  bytes: number
  /** الحد الأقصى التقريبي — `null` حين لا يوجد حد عملي (Firebase) */
  limit: number | null
}

export type ReadResult =
  | { status: 'ok'; data: AppData }
  /** لا شيء محفوظ بعد — أول تشغيل */
  | { status: 'empty' }
  /** يوجد محفوظ لكنه غير مقروء — البيانات الخام محفوظة للإنقاذ */
  | { status: 'corrupt'; message: string }

export interface StorageAdapter {
  read(): Promise<ReadResult>
  write(data: AppData): Promise<void>
  /** يبلّغ عن تغييرات جاءت من خارج هذه النسخة (تبويب آخر، لاحقًا جهاز آخر) */
  subscribe(onExternalChange: (data: AppData) => void): () => void
  usage(): Promise<StorageUsage>
}

// ============================================================
// التنفيذ المحلي
// ============================================================

const STORAGE_KEY = 'tafalna:v2'
const RESCUE_PREFIX = 'tafalna:rescue:'

/** الحد التقريبي لمساحة localStorage في أغلب المتصفحات */
export const LOCAL_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024

export class LocalStorageAdapter implements StorageAdapter {
  async read(): Promise<ReadResult> {
    let raw: string | null
    try {
      raw = localStorage.getItem(STORAGE_KEY)
    } catch {
      return {
        status: 'corrupt',
        message:
          'المتصفح يمنع الحفظ على هذا الجهاز (قد يكون وضع التصفّح الخاص). لن تُحفظ أي إضافة.',
      }
    }

    if (raw === null) return { status: 'empty' }

    try {
      const data = migrate(JSON.parse(raw))
      if (data) return { status: 'ok', data }
    } catch {
      // نسقط إلى مسار الإنقاذ تحت
    }

    // ⚠️ توجد بيانات محفوظة لكنها غير مقروءة.
    // القاعدة الحاكمة هنا: **لا نكتب فوقها أبدًا**. نأخذ نسخة خام جانبية
    // ونترك الأصل كما هو، لأن استرجاعه يدويًا ممكن — أما الكتابة فوقه
    // فتعني ضياع الذكريات نهائيًا.
    this.rescue(raw)
    return {
      status: 'corrupt',
      message:
        'تعذّرت قراءة البيانات المحفوظة على هذا الجهاز. حُفظت نسخة خام للإنقاذ ولم يُمسّ الأصل — لا تمسحوا بيانات المتصفح، واستعيدوا من نسخة احتياطية.',
    }
  }

  private rescue(raw: string): void {
    try {
      const key = `${RESCUE_PREFIX}${Date.now()}`
      // لا ندهس نسخة إنقاذ سابقة، ولا نضاعف الاستهلاك إن سبق حفظ نفس المحتوى
      const already = Object.keys(localStorage).some(
        (k) => k.startsWith(RESCUE_PREFIX) && localStorage.getItem(k) === raw,
      )
      if (!already) localStorage.setItem(key, raw)
    } catch {
      // المساحة ممتلئة — الأصل ما زال سليمًا وهو الأهم
    }
  }

  async write(data: AppData): Promise<void> {
    // قد يرمي QuotaExceededError — نتركه يصعد ليتحوّل إلى حالة خطأ مرئية
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  subscribe(onExternalChange: (data: AppData) => void): () => void {
    // حدث `storage` يصل فقط للتبويبات الأخرى — وهو بالضبط ما نريد:
    // الأم على تبويب والأب على آخر، بلا أن يدهس أحدهما تغييرات الثاني.
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        const data = migrate(JSON.parse(e.newValue))
        if (data) onExternalChange(data)
      } catch {
        // تجاهل: تبويبنا الحالي ما زال يحمل نسخة سليمة
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  async usage(): Promise<StorageUsage> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? ''
      // كل حرف في localStorage يُخزَّن بـ UTF-16 (بايتان تقريبًا)
      return { bytes: raw.length * 2, limit: LOCAL_STORAGE_LIMIT_BYTES }
    } catch {
      return { bytes: 0, limit: LOCAL_STORAGE_LIMIT_BYTES }
    }
  }

  /** مفاتيح نسخ الإنقاذ المحفوظة — تُعرض في الإعدادات عند وجودها */
  static rescueKeys(): string[] {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith(RESCUE_PREFIX)).sort()
    } catch {
      return []
    }
  }

  static readRescue(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }
}
