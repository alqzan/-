// ============================================================
// تهيئة Firebase — طبقة اختيارية بالكامل.
// إن لم تُضبط متغيّرات VITE_FIREBASE_* (لا يوجد مشروع Firebase بعد)،
// يبقى التطبيق يعمل بالكامل محليًا (localStorage) دون أي عطل.
// لا يُستدعى initializeApp إلا عند التأكد من اكتمال الإعداد.
// ============================================================

import { type FirebaseApp, getApps, initializeApp } from 'firebase/app'
import {
  type Auth,
  connectAuthEmulator,
  getAuth,
} from 'firebase/auth'
import {
  type Firestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { type FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage'

export interface FirebaseEnvConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

function readEnvConfig(): FirebaseEnvConfig | null {
  const env = import.meta.env
  const apiKey = env.VITE_FIREBASE_API_KEY
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN
  const projectId = env.VITE_FIREBASE_PROJECT_ID
  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID
  const appId = env.VITE_FIREBASE_APP_ID

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null
  }
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
  }
}

const envConfig = readEnvConfig()
const useEmulator = import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true'

/** true فقط إذا تم ضبط كل متغيرات Firebase العامة المطلوبة */
export const isFirebaseConfigured = envConfig !== null

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

function init() {
  if (!envConfig || app) return
  app = getApps().length ? getApps()[0] : initializeApp(envConfig)
  auth = getAuth(app)
  // persistentLocalCache: يفعّل التخزين المؤقت/العمل دون اتصال عبر IndexedDB
  // (بديل enableIndexedDbPersistence في SDK v9.18+) — يدعم تبويبات متعددة.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  storage = getStorage(app)

  if (useEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectStorageEmulator(storage, '127.0.0.1', 9199)
  }
}

if (isFirebaseConfigured) {
  init()
}

/** يُرجع null إن لم يكن Firebase مهيّأ بعد (لا يوجد إعداد) */
export function getFirebaseAuth(): Auth | null {
  return auth
}
export function getFirebaseDb(): Firestore | null {
  return db
}
export function getFirebaseStorage(): FirebaseStorage | null {
  return storage
}
