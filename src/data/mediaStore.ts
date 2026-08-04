// ============================================================
// مخزن الوسائط الثقيلة (التسجيلات الصوتية).
//
// لماذا مخزن منفصل؟ بقية البيانات تعيش في localStorage كنصّ JSON واحد،
// وحدّه العملي ~٥ ميجابايت للتطبيق كله. تسجيل صوتي واحد بلا سقف زمني
// يبتلع ذلك وحده، ثم تفشل كل عملية حفظ بعده — بما فيها كتابة رسالة.
//
// IndexedDB يخزّن Blob كما هو (بلا تضخّم base64 بمقدار الثلث)، وحصّته
// أكبر بمراتب. لذلك: الصوت هنا، والبيانات هناك، والرابط بينهما مفتاح نصّي.
//
// كل الدوال تتحمّل غياب IndexedDB (تصفّح خاص، متصفح قديم) بأن ترمي خطأً
// واضحًا يلتقطه المستدعي ويرجع إلى التضمين المباشر داخل البيانات.
// ============================================================

const DB_NAME = 'tafalna-media'
const DB_VERSION = 1
const STORE = 'audio'

export function isMediaStoreSupported(): boolean {
  return typeof indexedDB !== 'undefined'
}

/** مفتاح جديد لتسجيل — مستقلّ عن معرّف السجل حتى لا يتصادم بعد الاستعادة */
export function newMediaKey(): string {
  const rand =
    globalThis.crypto?.randomUUID?.() ??
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  return `audio_${rand}`
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!isMediaStoreSupported()) {
    return Promise.reject(new Error('IndexedDB غير متاح على هذا المتصفح'))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('تعذّر فتح مخزن الوسائط'))
  })

  // فشل الفتح مرة لا يعني فشله للأبد (قد يكون قفلًا مؤقتًا من تبويب آخر)
  dbPromise.catch(() => {
    dbPromise = null
  })

  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = run(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('فشلت عملية على مخزن الوسائط'))
        transaction.onabort = () =>
          reject(transaction.error ?? new Error('أُلغيت عملية مخزن الوسائط'))
      }),
  )
}

export function putAudio(key: string, blob: Blob): Promise<void> {
  return tx('readwrite', (store) => store.put(blob, key)).then(() => undefined)
}

export async function getAudio(key: string): Promise<Blob | null> {
  try {
    const value = await tx<Blob | undefined>('readonly', (store) => store.get(key))
    return value ?? null
  } catch {
    return null
  }
}

export async function deleteAudio(key: string): Promise<void> {
  try {
    await tx('readwrite', (store) => store.delete(key))
  } catch {
    /* حذف تسجيل مفقود أصلًا ليس خطأً يستحق إيقاف الحذف من الواجهة */
  }
}

async function allKeys(): Promise<string[]> {
  try {
    const keys = await tx<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
    return keys.filter((k): k is string => typeof k === 'string')
  } catch {
    return []
  }
}

/**
 * يحذف كل تسجيل لم يعد مذكورًا في البيانات.
 *
 * يُستدعى بعد الاستعادة أو المسح: بدونه تبقى تسجيلات يتيمة تأكل المساحة
 * ولا تظهر في أي شاشة، فيرى المستخدم مساحة مشغولة بلا سبب مرئي.
 */
export async function keepOnly(keys: string[]): Promise<void> {
  const wanted = new Set(keys)
  for (const key of await allKeys()) {
    if (!wanted.has(key)) await deleteAudio(key)
  }
}

/** مجموع أحجام التسجيلات المخزّنة بالبايت */
export async function audioUsage(): Promise<number> {
  let total = 0
  for (const key of await allKeys()) {
    const blob = await getAudio(key)
    total += blob?.size ?? 0
  }
  return total
}

// ---------- التحويل بين Blob وData URL (للنسخ الاحتياطي) ----------

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('تعذّرت قراءة التسجيل'))
    reader.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return await response.blob()
}
