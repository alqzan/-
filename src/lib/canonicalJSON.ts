// =============================================================
// تسلسل **مستقلّ عن ترتيب المفاتيح**.
//
// يُستخدم في موضعين لا يحتملان الخطأ:
//   • مقارنة ما دفعناه بما عاد إلينا من Firestore (`familySync`).
//   • فضّ التعادل بين نسختين لعنصر واحد عند الدمج (`dataService`) —
//     وهنا الاستقلال عن الترتيب ليس ترفًا: لو أنتج الجهازان نتيجتين
//     مختلفتين لنفس المُدخلين، تبادلا الدفع بلا نهاية.
//
// `JSON.stringify` يكتب المفاتيح بترتيب إدراجها، وFirestore يعيد حقول
// المستند بترتيب خاص به لا يطابق ترتيب `syncableSnapshot`. فكانت مقارنة
// الصدى بالنصّ الخام تفشل **دائمًا** رغم تطابق المحتوى حرفًا بحرف:
//
//   ندفع ← يعود الصدى ← يُحسب تغييرًا خارجيًا ← دمج ← تتغيّر البيانات
//   ← يدفع الجسر من جديد ← يعود الصدى … بلا نهاية
//
// حلقةٌ صامتة تكتب وتقرأ من Firestore بلا توقّف حتى تستنفد حصّة الخطة
// المجانية، وعندها تفشل كل كتابة وتبدو المزامنة «معطّلة» بلا سبب ظاهر.
// ترتيب المفاتيح ليس معلومة في بياناتنا، فلا يصحّ أن تُبنى عليه مقارنة.
// =============================================================

export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value === null || typeof value !== 'object') return value
  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort()) {
    // undefined يختفي في JSON.stringify أصلًا، وإسقاطه هنا يجعل
    // «الحقل غائب» و«الحقل undefined» متطابقين في المقارنة
    if (source[key] !== undefined) out[key] = sortKeys(source[key])
  }
  return out
}

/**
 * حقول محلية بحتة لا تغادر الجهاز إطلاقًا (صورة الموعد، صورة ملف الطفل).
 *
 * تُستثنى من كل مقارنة بين نسخة محلية ونسخة واردة: النسخة الواردة لا
 * تحملها أصلًا، فلو دخلت المقارنة لبدا كل موعد له صورة «مختلفًا» عن
 * نفسه إلى الأبد.
 */
const LOCAL_ONLY_FIELDS = new Set(['image', 'photo'])

/** مثل `canonicalJSON` لكن بلا الحقول المحلية البحتة — مقياس «هل تغيّر ما يُزامَن؟» */
export function syncableJSON(value: unknown): string {
  return canonicalJSON(stripLocalOnly(value))
}

function stripLocalOnly(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripLocalOnly)
  if (value === null || typeof value !== 'object') return value
  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(source)) {
    if (LOCAL_ONLY_FIELDS.has(key)) continue
    out[key] = stripLocalOnly(val)
  }
  return out
}
