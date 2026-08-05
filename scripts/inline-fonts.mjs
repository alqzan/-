// يجهّز نسخة الملف الواحد للنشر كرابط (Artifact):
// 1) يضمّن الخطوط (/fonts/*.woff2) كـ base64 داخل الـ CSS.
// 2) يستخرج «شظية» (fragment) بلا وسوم <html>/<head>/<body>
//    لتناسب هيكل صفحة الـ Artifact، ويكتبها في dist-single/artifact.html.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const htmlPath = path.join(root, 'dist-single', 'index.html')
let html = readFileSync(htmlPath, 'utf8')

// (0) تحويل سكربت الـ ES module إلى سكربت كلاسيكي.
// حزمة الإخراج بصيغة IIFE (بلا import/export)، فتعمل كسكربت عادي —
// وهذا ضروري ليشتغل التطبيق في معاينات الملفات على الجوال (Quick Look) وعبر file://
html = html.replace(/<script\s+type="module"\s+crossorigin>/gi, '<script>')

// (1) تضمين الخطوط
const fontFiles = [
  'thmanyahsans-Regular',
  'thmanyahsans-Medium',
  'thmanyahsans-Bold',
  'thmanyahserifdisplay-Medium',
  'thmanyahserifdisplay-Bold',
  'thmanyahseriftext-Regular',
  'thmanyahseriftext-Medium',
]
for (const name of fontFiles) {
  const file = path.join(root, 'public', 'fonts', `${name}.woff2`)
  const b64 = readFileSync(file).toString('base64')
  // نطابق المسار سواء كان مطلقًا (/fonts/..) أو نسبيًا (./fonts/..)
  const re = new RegExp(`\\.?/fonts/${name}\\.woff2`, 'g')
  html = html.replace(re, `data:font/woff2;base64,${b64}`)
}

// نسخة مستقلة كاملة (مستند HTML كامل بالخطوط مضمّنة) — تُفتح مباشرة بأي متصفح
// بدون خادم أو تسجيل دخول. نحذف روابط الأصول الخارجية (الأيقونة) لتفادي طلبات فاشلة.
const standalone = html
  .replace(/<link[^>]*rel="(icon|apple-touch-icon)"[^>]*>/gi, '')
  .replace(/<link[^>]*rel="preload"[^>]*fonts[^>]*>/gi, '')
writeFileSync(path.join(root, 'dist-single', 'tafalna-standalone.html'), standalone)

// (2) استخراج محتوى <head> و<body> ودمجهما كشظية
const headInner = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '')
  // نحذف وسوم preload الخاصة بالخط ووسوم charset/viewport (يوفّرها هيكل الـ Artifact)
  .replace(/<link[^>]*rel="preload"[^>]*>/gi, '')
  .replace(/<meta[^>]*charset[^>]*>/gi, '')
  .replace(/<meta[^>]*viewport[^>]*>/gi, '')
  // نحذف رابط الأيقونة (يوفّرها الـ Artifact ولا يوجد الملف داخل الشظية)
  .replace(/<link[^>]*rel="(icon|apple-touch-icon)"[^>]*>/gi, '')
const bodyInner = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? ''

const fragment = `${headInner}\n${bodyInner}`
writeFileSync(path.join(root, 'dist-single', 'artifact.html'), fragment)
console.log('artifact fragment size =', (fragment.length / 1024).toFixed(0), 'KB')
