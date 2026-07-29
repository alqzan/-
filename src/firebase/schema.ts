// ============================================================
// مخطط بيانات Firestore — يُطابق أنواع src/data/types.ts قدر الإمكان
// ليبقى الاستدعاء من الشاشات بمفردات مألوفة، مع إضافة حقول التعقّب
// الموحّدة المطلوبة لكل مستند (id / familyId / childId / createdAt /
// updatedAt / createdBy / schemaVersion).
//
// بنية المجموعات:
//   families/{familyId}
//   families/{familyId}/members/{uid}
//   families/{familyId}/children/{childId}
//   families/{familyId}/checklists/{itemId}
//   families/{familyId}/names/{nameId}
//   families/{familyId}/children/{childId}/memories/{id}      (صورة/يومية/كبسولة/معلم)
//   families/{familyId}/children/{childId}/feedings/{id}
//   families/{familyId}/children/{childId}/diapers/{id}
//   families/{familyId}/children/{childId}/sleep/{id}
//   families/{familyId}/children/{childId}/growth/{id}
//   families/{familyId}/children/{childId}/vaccinations/{id}   (يشير إلى templateId في vaccineSchedule.ts)
//   families/{familyId}/children/{childId}/appointments/{id}
//   families/{familyId}/children/{childId}/pregnancy/{id}      (ركلة/انقباضة/متابعة أم)
//
// القالب الرسمي للتطعيمات (VACCINE_SCHEDULE) لا يُرفع أبدًا إلى Firestore —
// السجلات هنا تُشير إليه فقط عبر templateId.
// ============================================================

import type { FieldValue, Timestamp } from 'firebase/firestore'

export const SCHEMA_VERSION = 1

export type Role = 'owner' | 'editor' | 'viewer'

/** حقول التعقّب المشتركة لكل مستند بيانات (وليس مستندات العائلة/العضوية) */
export interface RecordMeta {
  id: string
  familyId: string
  childId: string
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
  createdBy: string
  schemaVersion: number
}

export interface FamilyDoc {
  id: string
  name: string
  ownerUid: string
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
  schemaVersion: number
  /** كود دعوة قصير — يُخزَّن بصيغة هاش SHA-256 وليس نصًا صريحًا */
  joinCodeHash: string | null
  joinCodeExpiresAt: Timestamp | FieldValue | null
  /** علامة اكتمال الترحيل من التخزين المحلي — تُقرأ من كل الأجهزة المنضمّة */
  migrationCompletedAt: Timestamp | FieldValue | null
}

export interface MemberDoc {
  uid: string
  role: Role
  displayName: string
  joinedAt: Timestamp | FieldValue
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
  schemaVersion: number
}

export interface ChildDoc extends RecordMeta {
  localId: string
  name: string
  gender: 'unknown' | 'boy' | 'girl'
  lmpDate: string | null
  dueDate: string | null
  bornAt: string | null
  birthWeightKg?: number
  birthLengthCm?: number
  parents: { momName: string; dadName: string }
}

/** يوحّد Photo/JournalEntry/TimeCapsule/Milestone في مجموعة فرعية واحدة */
export type MemoryKind = 'photo' | 'journal' | 'capsule' | 'milestone'

export interface MemoryDoc extends RecordMeta {
  kind: MemoryKind
  // صورة
  media?: { storagePath: string; url: string; contentType: string; size: number } | null
  caption?: string
  favorite?: boolean
  // يومية
  title?: string
  text?: string
  // كبسولة زمنية
  message?: string
  openAt?: string
  isOpened?: boolean
  // معلم
  emoji?: string
  achievedAt?: string | null
  builtIn?: boolean
  note?: string
  // مشترك
  author?: 'mom' | 'dad'
  date?: string
  // حذف ناعم (للصور خصوصًا — يُنقل إلى سلة قبل الحذف الفعلي من Storage)
  deletedAt?: Timestamp | FieldValue | null
}

export interface FeedingDoc extends RecordMeta {
  startedAt: string
  kind: 'breast' | 'bottle'
  durationMin?: number
  side?: 'left' | 'right'
  amountMl?: number
}

export interface DiaperDoc extends RecordMeta {
  time: string
  kind: 'wet' | 'dirty' | 'both'
}

export interface SleepDoc extends RecordMeta {
  startedAt: string
  endedAt: string | null
}

export interface GrowthDoc extends RecordMeta {
  date: string
  weightKg?: number
  lengthCm?: number
  headCm?: number
}

export interface VaccinationDoc extends RecordMeta {
  /** ربط بجرعة القالب الرسمي VaccineTemplateEntry.id — null لجرعة يدوية */
  templateId: string | null
  name: string
  dueMonths: number
  givenAt: string | null
  builtIn: boolean
}

export type AppointmentType = 'checkup' | 'ultrasound' | 'lab' | 'other'

export interface AppointmentDoc extends RecordMeta {
  title: string
  dateTime: string
  type: AppointmentType
  location?: string
  notes?: string
  media?: { storagePath: string; url: string; contentType: string; size: number } | null
}

export type PregnancyKind = 'kick' | 'contraction' | 'momLog'

export interface PregnancyDoc extends RecordMeta {
  kind: PregnancyKind
  startedAt?: string
  endedAt?: string | null
  count?: number
  durationSec?: number
  date?: string
  weightKg?: number
  mood?: 'great' | 'good' | 'ok' | 'tired' | 'unwell'
  symptoms?: string[]
  note?: string
}

export interface ChecklistDoc {
  id: string
  familyId: string
  label: string
  category: string
  list: 'hospital' | 'shopping'
  done: boolean
  builtIn: boolean
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
  createdBy: string
  schemaVersion: number
}

export interface NameIdeaDoc {
  id: string
  familyId: string
  name: string
  gender: 'unknown' | 'boy' | 'girl'
  meaning?: string
  proposedBy: 'mom' | 'dad'
  votes: { mom: boolean; dad: boolean }
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
  createdBy: string
  schemaVersion: number
}

// ---------- مسارات المجموعات ----------

export const familyPath = (familyId: string) => `families/${familyId}`
export const membersPath = (familyId: string) => `families/${familyId}/members`
export const memberPath = (familyId: string, uid: string) => `families/${familyId}/members/${uid}`
export const childrenPath = (familyId: string) => `families/${familyId}/children`
export const childPath = (familyId: string, childId: string) =>
  `families/${familyId}/children/${childId}`
export const checklistsPath = (familyId: string) => `families/${familyId}/checklists`
export const namesPath = (familyId: string) => `families/${familyId}/names`

const childSub = (familyId: string, childId: string, sub: string) =>
  `families/${familyId}/children/${childId}/${sub}`

export const memoriesPath = (familyId: string, childId: string) =>
  childSub(familyId, childId, 'memories')
export const feedingsPath = (familyId: string, childId: string) =>
  childSub(familyId, childId, 'feedings')
export const diapersPath = (familyId: string, childId: string) =>
  childSub(familyId, childId, 'diapers')
export const sleepPath = (familyId: string, childId: string) =>
  childSub(familyId, childId, 'sleep')
export const growthPath = (familyId: string, childId: string) =>
  childSub(familyId, childId, 'growth')
export const vaccinationsPath = (familyId: string, childId: string) =>
  childSub(familyId, childId, 'vaccinations')
export const appointmentsPath = (familyId: string, childId: string) =>
  childSub(familyId, childId, 'appointments')
export const pregnancyPath = (familyId: string, childId: string) =>
  childSub(familyId, childId, 'pregnancy')

/** مسار ملف في Storage: {familyId}/{childId}/{mediaId} */
export const storageMediaPath = (familyId: string, childId: string, mediaId: string) =>
  `${familyId}/${childId}/${mediaId}`
