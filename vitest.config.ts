import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(rootDir, './src') },
  },
  test: {
    // jsdom يوفّر localStorage و window المطلوبين لاختبارات طبقة التخزين
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // نثبّت المنطقة الزمنية: اختبارات التواريخ تحرس ضد انزياح اليوم،
    // فلا يصحّ أن تتغيّر نتيجتها بتغيّر جهاز المطوّر أو خادم CI.
    env: { TZ: 'Asia/Riyadh' },
  },
})
