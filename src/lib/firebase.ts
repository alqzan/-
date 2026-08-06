import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// =============================================================
// إعداد Firebase — لمزامنة العائلة النصية فقط (راجع FIREBASE.md).
//
// عمدًا: لا استيراد لـ `firebase/storage` في هذا الملف ولا في أي ملف
// آخر بالمشروع. Storage يتطلّب خطة Blaze المدفوعة، والمشروع يعمل على
// Spark مجانًا — Auth المجهول وFirestore فقط، بلا رفع صور أو صوت أبدًا.
// =============================================================

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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

export function getFirestoreDb(): Firestore {
  if (!db) db = getFirestore(ensureApp())
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
