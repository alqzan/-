import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// تنظيف الشجرة بعد كل اختبار: نوافذ التوثيق تُرسم عبر Portal في
// <body>، فبدون التنظيف تتراكم نوافذ الاختبار السابق وتلتبس على
// الاستعلامات التي تبحث بالاسم.
afterEach(cleanup)
