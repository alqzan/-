import { describe, expect, it } from 'vitest'
import { FAMILY_CODE_LENGTH, generateFamilyCode, isValidFamilyCode } from './familyCode'

describe('رمز ربط العائلة', () => {
  it('يُولّد رمزًا بطول ٤٣ حرفًا', () => {
    expect(generateFamilyCode().length).toBe(43)
    expect(FAMILY_CODE_LENGTH).toBe(43)
  })

  it('يُولّد رمزًا من حروف وأرقام إنجليزية فقط', () => {
    expect(generateFamilyCode()).toMatch(/^[A-Za-z0-9]{43}$/)
  })

  it('لا يكرّر نفس الرمز عبر استدعاءات متتالية', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateFamilyCode()))
    expect(codes.size).toBe(50)
  })

  it('يقبل رمزًا صحيح الشكل', () => {
    expect(isValidFamilyCode(generateFamilyCode())).toBe(true)
  })

  it('يرفض رمزًا أقصر أو أطول من ٤٣ حرفًا', () => {
    expect(isValidFamilyCode('A'.repeat(42))).toBe(false)
    expect(isValidFamilyCode('A'.repeat(44))).toBe(false)
  })

  it('يرفض رمزًا فيه رموز غير مسموحة', () => {
    expect(isValidFamilyCode('!'.repeat(43))).toBe(false)
    expect(isValidFamilyCode('أ'.repeat(43))).toBe(false)
  })

  it('يتجاهل مسافات زائدة حول الرمز', () => {
    expect(isValidFamilyCode(`  ${generateFamilyCode()}  `)).toBe(true)
  })
})
