import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'

// إعداد بناء «ملف واحد» للمعاينة/المشاركة كرابط (Artifact):
// - يُدمج كل JS/CSS والخطوط داخل index.html واحد مكتفٍ ذاتيًا.
// - يُبنى مع VITE_HASH_ROUTER=1 ليعمل التنقّل بدون خادم.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  // نفعّل توجيه الهاش لنسخة الملف الواحد (تنقّل بلا خادم)
  define: {
    'import.meta.env.VITE_HASH_ROUTER': JSON.stringify('1'),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist-single',
    assetsInlineLimit: 100 * 1024 * 1024, // ادمج كل الأصول (بما فيها الخطوط) كـ base64
    cssCodeSplit: false,
    reportCompressedSize: false,
    // سكربت كلاسيكي (IIFE) بدل ES module حتى يعمل في معاينات الملفات على الجوال
    // (مثل Quick Look في iOS) وعند الفتح المباشر عبر file://
    target: 'es2015',
    modulePreload: false,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
})
