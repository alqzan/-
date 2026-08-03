import type { Photo } from '../data/types'

// تحويل ملف صورة إلى Data URL مع تصغيره للحفاظ على مساحة التخزين المحلي.
// (لاحقًا مع Firebase Storage نرفع الملف الأصلي بدل التخزين المحلي.)

/**
 * مصدر عرض الصورة.
 *
 * مصدر واحد لهذا المنطق في كل التطبيق: اليوم الصور Data URLs محلية،
 * وبعد ربط Firebase Storage تصير روابط تنزيل. الشاشات تستدعي هذه الدالة
 * فلا يتغيّر فيها سطر واحد عند التبديل.
 */
export function photoSrc(photo: Pick<Photo, 'dataUrl' | 'remoteUrl'>): string {
  return photo.dataUrl ?? photo.remoteUrl ?? ''
}

/** حجم الصورة التقريبي بالبايت — يُحتسب فقط للصور المخزّنة محليًا */
export function photoBytes(photo: Pick<Photo, 'dataUrl'>): number {
  return (photo.dataUrl?.length ?? 0) * 2
}

export async function fileToDataUrl(file: File, maxSize = 1000): Promise<string> {
  const dataUrl = await readAsDataUrl(file)
  try {
    return await downscale(dataUrl, maxSize)
  } catch {
    return dataUrl
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function downscale(dataUrl: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no ctx'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
