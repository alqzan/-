// =============================================================
// رمز ربط العائلة.
//
// لا حسابات ولا كلمات مرور في هذا التطبيق — رمز عشوائي قوي (٤٣ حرفًا)
// هو معرّف مستند العائلة في Firestore *وسرّ الوصول إليه* في آنٍ واحد.
// من يملك الرمز يملك الوصول، لذا يجب أن يكون تخمينه مستحيلًا عمليًا:
// ٤٣ حرفًا من أبجدية ٦٢ رمزًا ≈ ٢٥٦ بت من العشوائية.
// =============================================================

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export const FAMILY_CODE_LENGTH = 43

/** رمز عشوائي قوي بطول ٤٣ حرفًا، مُولَّد عبر `crypto.getRandomValues` */
export function generateFamilyCode(): string {
  const bytes = new Uint8Array(FAMILY_CODE_LENGTH)
  crypto.getRandomValues(bytes)
  let out = ''
  // انحياز طفيف جدًا (256 غير قابلة للقسمة على 62) لا يهم هنا: هذا سرّ
  // مشاركة بين والدين لا بروتوكولًا تشفيريًا يتطلّب توزيعًا مثاليًا.
  for (let i = 0; i < FAMILY_CODE_LENGTH; i++) {
    out += CHARSET[bytes[i] % CHARSET.length]
  }
  return out
}

/** يتحقّق من شكل الرمز فقط (الطول والأبجدية) — لا يضمن وجوده فعليًا في Firestore */
export function isValidFamilyCode(code: string): boolean {
  return new RegExp(`^[A-Za-z0-9]{${FAMILY_CODE_LENGTH}}$`).test(code.trim())
}
