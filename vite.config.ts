import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// عند النشر على GitHub Pages يعيش الموقع تحت مسار فرعي (/<repo>/)،
// فلا بد أن يعرفه Vite ليولّد روابط الأصول صحيحة. يُمرَّر من CI عبر
// VITE_BASE، ويبقى '/' في التطوير المحلي.
const base = process.env.VITE_BASE ?? '/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        // الخطوط جزء من هوية التطبيق ومن تجربة العمل بلا شبكة،
        // فتُخزّن مسبقًا مع بقية الأصول لا عند أول طلب.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'طفلنا',
        short_name: 'طفلنا',
        description: 'حكاية طفلكم موثّقة من أول أسبوع — صور ورسائل ولحظات أولى',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#F8F3EA',
        background_color: '#FDFBF7',
        display: 'standalone',
        // نسبيّان حتى يعمل التثبيت من مسار فرعي كما يعمل من الجذر
        start_url: base,
        scope: base,
        // اختصارات الضغط المطوّل على أيقونة التطبيق — أسرع طريق للتوثيق
        shortcuts: [
          {
            name: 'توثيق صورة',
            short_name: 'صورة',
            url: `${base}?capture=photo`,
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'كتابة رسالة',
            short_name: 'رسالة',
            url: `${base}?capture=letter`,
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'رسالة صوتية',
            short_name: 'صوت',
            url: `${base}?capture=voice`,
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        // PNG أولًا ثم SVG: كثير من مشغّلات أندرويد و iOS لا تقبل SVG
        // كأيقونة تثبيت، فتظهر أيقونة عامة أو لقطة من الصفحة بدل الأيقونة.
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
