import { defineConfig } from 'vitest/config'

// إعداد Vitest منفصل لاختبارات قواعد Firebase (Firestore/Storage).
// يُشغَّل فقط ضد محاكي Firebase المحلي — انظر README قسم "اختبار القواعد".
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
