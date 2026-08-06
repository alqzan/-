/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HASH_ROUTER?: string
  // إعداد Firebase — اختياري: غيابه يُبقي التطبيق يعمل محليًا بلا مزامنة.
  // القيم ليست سرّية (مفاتيح ويب تُشحن مع أي تطبيق Firebase)، لذا تُمرَّر
  // من متغيّرات Actions العامة (vars) لا من الأسرار. راجع FIREBASE.md.
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
