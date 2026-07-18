import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// نضمن اتجاه RTL واللغة العربية على مستوى المستند (يفيد أيضًا عند التضمين).
document.documentElement.setAttribute('dir', 'rtl')
document.documentElement.setAttribute('lang', 'ar')

// عند البناء كملف واحد للمعاينة (VITE_HASH_ROUTER) نستخدم توجيه الهاش
// حتى يعمل التنقّل بدون خادم. غير ذلك: توجيه المسار العادي.
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)
