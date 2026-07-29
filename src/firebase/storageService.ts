// ============================================================
// رفع/حذف ملفات الوسائط (صور الذكريات وصور المواعيد) في Firebase
// Storage. لا نخزّن Base64 في Firestore أبدًا — فقط رابط التنزيل
// (url) وبيانات وصفية (contentType/size/uploadedBy/uploadedAt).
//
// الحذف: «حذف ناعم» أولًا — نُعلّم مستند Firestore بـ deletedAt (ويُمكن
// استرجاعه)، ولا نحذف ملف Storage والمستند فعليًا (حذف صلب) إلا في خطوة
// لاحقة صريحة (مثال: مهمة تنظيف دورية أو تأكيد ثانٍ من المستخدم على
// إفراغ «سلة المهملات»).
// ============================================================

import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getFirebaseDb, getFirebaseStorage, isFirebaseConfigured } from './config'
import { storageMediaPath } from './schema'

export const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024 // ٨ ميجابايت — يطابق حد قواعد storage.rules

export interface UploadedMedia {
  storagePath: string
  url: string
  contentType: string
  size: number
}

function requireStorage() {
  const storage = getFirebaseStorage()
  if (!storage || !isFirebaseConfigured) {
    throw new Error('Firebase Storage غير مهيّأ.')
  }
  return storage
}

/** يحوّل Data URL (كما يُنتجه src/lib/image.ts) إلى Blob قابل للرفع */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

/** يرفع صورة إلى {familyId}/{childId}/{mediaId} ويُرجع بيانات وصفية للحفظ في Firestore */
export async function uploadMedia(
  familyId: string,
  childId: string,
  mediaId: string,
  blob: Blob,
): Promise<UploadedMedia> {
  if (!ALLOWED_MEDIA_TYPES.includes(blob.type)) {
    throw new Error('صيغة الملف غير مدعومة — الصور فقط (JPEG/PNG/WebP).')
  }
  if (blob.size > MAX_MEDIA_BYTES) {
    throw new Error('حجم الصورة أكبر من الحد المسموح (٨ ميجابايت).')
  }
  const storage = requireStorage()
  const path = storageMediaPath(familyId, childId, mediaId)
  const objectRef = ref(storage, path)
  await uploadBytes(objectRef, blob, { contentType: blob.type })
  const url = await getDownloadURL(objectRef)
  return { storagePath: path, url, contentType: blob.type, size: blob.size }
}

/** الخطوة الأولى عند حذف صورة: تعليم ناعم قابل للاسترجاع، لا حذف فعلي */
export async function softDeleteMedia(memoryDocPath: string, id: string): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error('Firestore غير مهيّأ.')
  await updateDoc(doc(db, memoryDocPath, id), { deletedAt: serverTimestamp() })
}

/** الخطوة الثانية (حذف صلب) — تُستدعى صراحةً لاحقًا (مثلًا من «إفراغ السلة») */
export async function hardDeleteMedia(
  memoryDocPath: string,
  id: string,
  storagePath: string | null,
): Promise<void> {
  const db = getFirebaseDb()
  const storage = getFirebaseStorage()
  if (!db) throw new Error('Firestore غير مهيّأ.')
  if (storagePath && storage) {
    try {
      await deleteObject(ref(storage, storagePath))
    } catch {
      // إن كان الملف محذوفًا مسبقًا من Storage، نتابع حذف المستند دون فشل كامل
    }
  }
  await deleteDoc(doc(db, memoryDocPath, id))
}
