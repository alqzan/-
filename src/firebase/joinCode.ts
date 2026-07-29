// أداة توليد وتجزئة كود الدعوة العائلي — منطق بلا حالة، قابل للاختبار
// بمعزل عن Firebase نفسه.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // بلا أحرف/أرقام متشابهة (0/O، 1/I/L)

/** كود دعوة عشوائي مقروء بصريًا (٧ محارف) */
export function generateJoinCode(length = 7): string {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

/** هاش SHA-256 (سداسي عشري) — يُخزَّن في مستند العائلة بدل الكود الصريح،
 *  حتى لا يمنح الاطلاع على مستند العائلة وحده صلاحية الانضمام */
export async function hashJoinCode(code: string): Promise<string> {
  const normalized = code.trim().toUpperCase()
  const data = new TextEncoder().encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** مدة صلاحية افتراضية لكود الدعوة قبل أن يجب تجديده */
export const JOIN_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // ٧ أيام
