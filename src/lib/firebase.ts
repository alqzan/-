import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore'

// =============================================================
// إعداد Firebase — لمزامنة العائلة النصية فقط (راجع FIREBASE.md).
//
// عمدًا: لا استيراد لـ `firebase/storage` في هذا الملف ولا في أي ملف
// آخر بالمشروع. Storage يتطلّب خطة Blaze المدفوعة، والمشروع يعمل على
// Spark مجانًا — Auth المجهول وFirestore فقط، بلا رفع صور أو صوت أبدًا.
//
// القيم الحقيقية لمشروع "tafalna" مضمَّنة هنا مباشرة كافتراضي، وليست
// سرًّا: مفاتيح Firebase للويب تُشحن مع أي تطبيق وتظهر لأي زائر يفتح
// أدوات المطوّر — الحماية الفعلية هي firestore.rules وحدها. متغيّرات
// VITE_FIREBASE_* تبقى وسيلة تجاوز اختيارية (بيئة تجربة مختلفة مثلًا)
// عبر `.env.local`، لا ضرورة لها في الاستخدام العادي أو في النشر.
// =============================================================

const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyDT5S0Xj5sZG68GY4mhjbPI8JNV1_1lyIc',
  authDomain: 'tafalna.firebaseapp.com',
  projectId: 'tafalna',
  messagingSenderId: '829976779215',
  appId: '1:829976779215:web:443b89af57a531ab159aba',
}

/** فارغ أو غائب كلاهما "غير مُعرَّف" — سلسلة فارغة من env vars تعني تجاهل التجاوز لا تعطيل الإعداد */
const override = (v: string | undefined): string | undefined => (v ? v : undefined)

const config = {
  apiKey: override(import.meta.env.VITE_FIREBASE_API_KEY) ?? DEFAULT_CONFIG.apiKey,
  authDomain: override(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) ?? DEFAULT_CONFIG.authDomain,
  projectId: override(import.meta.env.VITE_FIREBASE_PROJECT_ID) ?? DEFAULT_CONFIG.projectId,
  messagingSenderId:
    override(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) ?? DEFAULT_CONFIG.messagingSenderId,
  appId: override(import.meta.env.VITE_FIREBASE_APP_ID) ?? DEFAULT_CONFIG.appId,
}

/** true فقط حين تتوفر كل مفاتيح الإعداد اللازمة — بلا ذلك لا نحاول الاتصال أصلًا */
export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

function ensureApp(): FirebaseApp {
  if (!app) {
    // getApps() يحمي من "Firebase App named '[DEFAULT]' already exists" عند
    // إعادة التصيير السريع في التطوير (React StrictMode / HMR)
    app = getApps()[0] ?? initializeApp(config)
  }
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(ensureApp())
  return auth
}

/**
 * `ignoreUndefinedProperties` ليست تحسينًا — بدونها تتعطّل المزامنة كلها.
 *
 * Firestore يرفض الحمولة **كاملةً** إذا حوت قيمة `undefined` واحدة، و
 * `migrate` تُنتج مفتاحًا قيمته `undefined` لكل حقل اختياري غائب. الحماية
 * الأساسية في `syncableSnapshot` التي تنزعها قبل الإرسال؛ وهذا السطر شبكة
 * أمان تحتها: حقل اختياري جديد يُضاف يومًا ما لن يُسقط المزامنة بصمت.
 *
 * `initializeFirestore` تُرمى إن كان المثيل قد أُنشئ سابقًا بـ`getFirestore`،
 * ولا يحدث ذلك في هذا التطبيق (لا مدخل غير هذه الدالة) — والرجوع الآمن
 * يبقى احتياطًا لا أكثر.
 */
export function getFirestoreDb(): Firestore {
  if (!db) {
    try {
      db = initializeFirestore(ensureApp(), { ignoreUndefinedProperties: true })
    } catch {
      db = getFirestore(ensureApp())
    }
  }
  return db
}

let anonSignIn: Promise<string> | null = null

/**
 * يسجّل دخولًا مجهولًا إن لزم ويُرجع uid.
 * لا هوية حقيقية هنا — الأمان الفعلي هو معرفة رمز العائلة نفسه.
 */
export function ensureAnonymousAuth(): Promise<string> {
  if (!isFirebaseConfigured()) {
    return Promise.reject(new Error('لم يُهيّأ الاتصال بـ Firebase بعد.'))
  }
  const authInstance = getFirebaseAuth()
  if (authInstance.currentUser) return Promise.resolve(authInstance.currentUser.uid)
  if (!anonSignIn) {
    anonSignIn = signInAnonymously(authInstance)
      .then((cred) => cred.user.uid)
      .catch((err: unknown) => {
        anonSignIn = null
        throw err
      })
  }
  return anonSignIn
}
