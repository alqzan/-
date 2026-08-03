import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { boot } from './data/dataService'
import './index.css'

// نضمن اتجاه RTL واللغة العربية على مستوى المستند (يفيد أيضًا عند التضمين).
document.documentElement.setAttribute('dir', 'rtl')
document.documentElement.setAttribute('lang', 'ar')

// عند البناء كملف واحد للمعاينة (VITE_HASH_ROUTER) نستخدم توجيه الهاش
// حتى يعمل التنقّل بدون خادم. غير ذلك: توجيه المسار العادي.
const useHashRouter = Boolean(import.meta.env.VITE_HASH_ROUTER)
const Router = useHashRouter ? HashRouter : BrowserRouter

// عند النشر تحت مسار فرعي (GitHub Pages) لا بد أن يعرف الموجّه المسار الأساس،
// وإلا فتح الرابط على شاشة فارغة.
const basename = useHashRouter ? undefined : import.meta.env.BASE_URL

function mount() {
  // نبدأ قراءة التخزين مبكرًا؛ الواجهة تعرض شاشة انتظار حتى تجهز.
  void boot()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <Router basename={basename}>
          <App />
        </Router>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

// نؤخّر التركيب حتى يجهز الـ DOM — يهمّ عند تشغيل السكربت كسكربت كلاسيكي
// (نسخة الملف الواحد) حيث يُنفّذ قبل اكتمال بناء الصفحة.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
