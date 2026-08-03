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
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'طفلنا',
        short_name: 'طفلنا',
        description: 'تطبيق يرافق طفلكما من الحمل إلى ما بعد الولادة',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#6b9e78',
        background_color: '#fbf7f0',
        display: 'standalone',
        // نسبيّان حتى يعمل التثبيت من مسار فرعي كما يعمل من الجذر
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
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
