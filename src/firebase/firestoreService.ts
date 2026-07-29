// ============================================================
// طبقة CRUD عامة لسجلات الطفل (تغذية/حفاضات/نوم/نمو/تطعيمات/مواعيد/
// حمل/ذكريات) — كل دالة تكتب مستندًا واحدًا فقط (لا رفع مصفوفات كاملة)،
// وتستخدم serverTimestamp() لأوقات الإنشاء/التحديث.
//
// المستمعون (listeners) مقيَّدة النطاق دائمًا: بطفل واحد، ومحدودة العدد
// (limit) للمجموعات الكثيفة تاريخيًا كالذكريات والتغذية، وليست اشتراكًا
// غير محدود بكامل التاريخ.
// ============================================================

import {
  type DocumentData,
  type Query,
  collection,
  deleteDoc,
  doc,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getFirebaseDb, isFirebaseConfigured } from './config'
import { setSyncStatus } from './syncStatus'
import { SCHEMA_VERSION, type RecordMeta } from './schema'

function requireDb() {
  const db = getFirebaseDb()
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase غير مهيّأ — لا يمكن استخدام هذه الوظيفة قبل ضبط إعدادات المشروع.')
  }
  return db
}

/** إنشاء/استبدال مستند سجل بمعرّف ثابت (مستقر) — نفس id المحلي دائمًا،
 *  حتى تكون إعادة الرفع (مثلًا بعد انقطاع اتصال أثناء الترحيل) تحديثًا
 *  آمنًا (upsert) لا تكرارًا لمستند جديد. */
export async function upsertRecord<T extends Record<string, unknown>>(
  path: string,
  id: string,
  data: T,
  opts: { familyId: string; childId: string; createdBy: string; isNew?: boolean },
): Promise<void> {
  const db = requireDb()
  setSyncStatus({ state: 'syncing', message: null })
  try {
    const ref = doc(db, path, id)
    const meta: Partial<RecordMeta> = {
      id,
      familyId: opts.familyId,
      childId: opts.childId,
      updatedAt: serverTimestamp(),
      createdBy: opts.createdBy,
      schemaVersion: SCHEMA_VERSION,
    }
    if (opts.isNew !== false) {
      // createdAt يُكتب فقط عند أول إنشاء — merge:true لا يستبدله لاحقًا
      // إن كان موجودًا مسبقًا لنفس المعرّف (سيناريو استئناف الترحيل).
      await setDoc(
        ref,
        { ...data, ...meta, createdAt: serverTimestamp() },
        { merge: true },
      )
    } else {
      await updateDoc(ref, { ...data, ...meta } as DocumentData)
    }
    setSyncStatus({ state: 'saved', message: null })
  } catch (err) {
    setSyncStatus({
      state: navigator.onLine ? 'error' : 'offline',
      message: err instanceof Error ? err.message : 'تعذّر الحفظ في السحابة.',
    })
    throw err
  }
}

export async function deleteRecord(path: string, id: string): Promise<void> {
  const db = requireDb()
  await deleteDoc(doc(db, path, id))
}

export interface ScopedListenerOptions {
  /** عمود ترتيب اختياري (مثال: 'startedAt' أو 'date') — تنازليًا افتراضيًا */
  orderByField?: string
  /** حد أقصى للمستندات المُشترَك بها — لا نُحمّل تاريخًا كاملًا دفعة واحدة */
  limit?: number
}

/** اشتراك مُقيَّد النطاق بمجموعة فرعية لطفل واحد فقط */
export function subscribeCollection<T>(
  path: string,
  onData: (items: (T & { id: string })[]) => void,
  opts: ScopedListenerOptions = {},
): () => void {
  const db = requireDb()
  let q: Query<DocumentData> = collection(db, path)
  if (opts.orderByField) q = query(q, orderBy(opts.orderByField, 'desc'))
  q = query(q, fsLimit(opts.limit ?? 100))

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))
      onData(items)
      setSyncStatus({ state: 'saved', message: null })
    },
    (err) => {
      setSyncStatus({
        state: navigator.onLine ? 'error' : 'offline',
        message: err.message,
      })
    },
  )
}
