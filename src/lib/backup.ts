import { exportSnapshot } from '../data/dataService'
import { localDateInputValue } from './localDate'

// نسخ احتياطي محلي: كل شيء محفوظ على جهاز واحد،
// فأي مسح لبيانات المتصفح يعني ضياع الذكريات. الملف المُصدَّر هو خط الدفاع.

const LAST_BACKUP_KEY = 'tafalna:last-backup'

/** تاريخ آخر نسخة احتياطية نُزّلت من هذا الجهاز (YYYY-MM-DD) */
export function lastBackupDate(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    return null
  }
}

/** عدد الأيام منذ آخر نسخة — null إذا لم تُؤخذ نسخة أبدًا */
export function daysSinceBackup(): number | null {
  const last = lastBackupDate()
  if (!last) return null
  const diff = Date.now() - new Date(last).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

/** ينزّل كل البيانات كملف JSON باسم مؤرّخ */
export function downloadBackup(): string {
  const json = exportSnapshot()
  const filename = `tafalna-backup-${localDateInputValue()}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // نحرّر الرابط بعد أن يلتقطه المتصفح
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  try {
    localStorage.setItem(LAST_BACKUP_KEY, localDateInputValue())
  } catch {
    // تسجيل تاريخ النسخة ثانوي — لا يمنع نجاح التنزيل
  }
  return filename
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'))
    reader.readAsText(file)
  })
}

/** صيغة مقروءة لحجم بالبايت */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} كيلوبايت`
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`
}
