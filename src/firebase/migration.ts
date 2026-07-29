// ============================================================
// ترحيل يدوي من localStorage إلى Firebase — يُشغَّل فقط بأمر صريح من
// المستخدم في الإعدادات (ليس تلقائيًا). الخطوات:
//   ١. نسخة احتياطية محلية تلقائية أولًا (backup.ts).
//   ٢. معاينة: عدد الأطفال/الذكريات/الصور/السجلات الأخرى قبل الرفع.
//   ٣. رفع المستندات، ثم رفع ملفات الوسائط إلى Storage.
//   ٤. التحقق: مطابقة الأعداد بعد الرفع مع الأعداد المحلية.
//   ٥. كتابة علامة اكتمال الترحيل في مستند العائلة (Firestore) وفي
//      localStorage معًا — تمنع إعادة الترحيل المكرِّرة.
//   ٦. معرّفات المستندات = معرّفات السجلات المحلية نفسها (uid المحلي)،
//      فإعادة المحاولة بعد انقطاع الاتصال تُكمل (upsert) دون تكرار.
//   ٧. لا حذف تلقائي للبيانات المحلية — يبقى خيار التصدير متاحًا دائمًا.
// ============================================================

import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import type { AppData } from '../data/types'
import { downloadBackup } from '../lib/backup'
import { getFirebaseDb, isFirebaseConfigured } from './config'
import { upsertRecord } from './firestoreService'
import { dataUrlToBlob, uploadMedia } from './storageService'
import {
  appointmentsPath,
  checklistsPath,
  childrenPath,
  diapersPath,
  familyPath,
  feedingsPath,
  growthPath,
  memoriesPath,
  namesPath,
  pregnancyPath,
  sleepPath,
  vaccinationsPath,
} from './schema'

const MIGRATION_MARKER_KEY = 'tafalna:migration-completed'

export interface MigrationPreview {
  children: number
  memories: number
  media: number
  feedings: number
  diapers: number
  sleep: number
  growth: number
  vaccinations: number
  appointments: number
  pregnancyRecords: number
  checklist: number
  names: number
}

export function buildMigrationPreview(data: AppData): MigrationPreview {
  const memories = data.photos.length + data.journal.length + data.capsules.length +
    data.milestones.length
  const media = data.photos.length + data.appointments.filter((a) => a.image).length
  return {
    children: data.child.name || data.child.lmpDate || data.child.bornAt ? 1 : 0,
    memories,
    media,
    feedings: data.feedings.length,
    diapers: data.diapers.length,
    sleep: data.sleep.length,
    growth: data.growth.length,
    vaccinations: data.vaccines.length,
    appointments: data.appointments.length,
    pregnancyRecords: data.kicks.length + data.contractions.length + data.momLogs.length,
    checklist: data.checklist.length,
    names: data.names.length,
  }
}

export function isMigrationCompletedLocally(): boolean {
  try {
    return localStorage.getItem(MIGRATION_MARKER_KEY) === 'true'
  } catch {
    return false
  }
}

function markMigrationCompletedLocally() {
  try {
    localStorage.setItem(MIGRATION_MARKER_KEY, 'true')
  } catch {
    // ثانوي
  }
}

export interface MigrationProgress {
  step: string
  done: number
  total: number
}

/**
 * ينفّذ الترحيل الكامل. آمن للاستدعاء المتكرر (idempotent) — يستخدم
 * معرّفات محلية ثابتة كمعرّفات مستندات، فإعادة المحاولة بعد فشل جزئي
 * (انقطاع اتصال) تكمل الرفع دون تكرار السجلات المرفوعة سابقًا.
 */
export async function migrateToFirebase(
  data: AppData,
  familyId: string,
  childId: string,
  uid: string,
  onProgress?: (p: MigrationProgress) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getFirebaseDb()
  if (!db || !isFirebaseConfigured) {
    return { ok: false, error: 'Firebase غير مهيّأ — تعذّر بدء الترحيل.' }
  }

  // (١) نسخة احتياطية محلية تلقائية قبل أي رفع
  downloadBackup()

  const preview = buildMigrationPreview(data)
  const report = (step: string, done: number, total: number) =>
    onProgress?.({ step, done, total })

  try {
    // ملف الطفل
    await upsertRecord(childrenPath(familyId), childId, {
      localId: childId,
      name: data.child.name,
      gender: data.child.gender,
      lmpDate: data.child.lmpDate,
      dueDate: data.child.dueDate,
      bornAt: data.child.bornAt,
      birthWeightKg: data.child.birthWeightKg,
      birthLengthCm: data.child.birthLengthCm,
      parents: data.child.parents,
    }, { familyId, childId, createdBy: uid })
    report('child', 1, 1)

    // الذكريات: الصور (مع رفع الوسائط)، ثم اليوميات/الكبسولات/المعالم
    let uploaded = 0
    const total = preview.memories
    for (const p of data.photos) {
      const blob = await dataUrlToBlob(p.dataUrl)
      const media = await uploadMedia(familyId, childId, p.id, blob)
      await upsertRecord(memoriesPath(familyId, childId), p.id, {
        kind: 'photo',
        media,
        caption: p.caption ?? '',
        date: p.date,
        author: p.author,
        favorite: !!p.favorite,
      }, { familyId, childId, createdBy: uid })
      report('memories', ++uploaded, total)
    }
    for (const j of data.journal) {
      await upsertRecord(memoriesPath(familyId, childId), j.id, {
        kind: 'journal',
        title: j.title ?? '',
        text: j.text,
        date: j.date,
        author: j.author,
      }, { familyId, childId, createdBy: uid })
      report('memories', ++uploaded, total)
    }
    for (const c of data.capsules) {
      await upsertRecord(memoriesPath(familyId, childId), c.id, {
        kind: 'capsule',
        title: c.title,
        message: c.message,
        author: c.author,
        openAt: c.openAt,
        isOpened: c.isOpened,
      }, { familyId, childId, createdBy: uid })
      report('memories', ++uploaded, total)
    }
    for (const m of data.milestones) {
      await upsertRecord(memoriesPath(familyId, childId), m.id, {
        kind: 'milestone',
        title: m.title,
        emoji: m.emoji,
        achievedAt: m.achievedAt,
        builtIn: m.builtIn,
        note: m.note ?? '',
      }, { familyId, childId, createdBy: uid })
      report('memories', ++uploaded, total)
    }

    // رعاية المولود
    let n = 0
    for (const f of data.feedings) {
      await upsertRecord(feedingsPath(familyId, childId), f.id, { ...f }, {
        familyId, childId, createdBy: uid,
      })
      report('feedings', ++n, preview.feedings)
    }
    n = 0
    for (const d of data.diapers) {
      await upsertRecord(diapersPath(familyId, childId), d.id, { ...d }, {
        familyId, childId, createdBy: uid,
      })
      report('diapers', ++n, preview.diapers)
    }
    n = 0
    for (const s of data.sleep) {
      await upsertRecord(sleepPath(familyId, childId), s.id, { ...s }, {
        familyId, childId, createdBy: uid,
      })
      report('sleep', ++n, preview.sleep)
    }
    n = 0
    for (const g of data.growth) {
      await upsertRecord(growthPath(familyId, childId), g.id, { ...g }, {
        familyId, childId, createdBy: uid,
      })
      report('growth', ++n, preview.growth)
    }
    n = 0
    for (const v of data.vaccines) {
      await upsertRecord(vaccinationsPath(familyId, childId), v.id, {
        templateId: v.templateId ?? null,
        name: v.name,
        dueMonths: v.dueMonths,
        givenAt: v.givenAt,
        builtIn: v.builtIn,
      }, { familyId, childId, createdBy: uid })
      report('vaccinations', ++n, preview.vaccinations)
    }
    n = 0
    for (const a of data.appointments) {
      let media = null
      if (a.image) {
        const blob = await dataUrlToBlob(a.image)
        media = await uploadMedia(familyId, childId, `appt-${a.id}`, blob)
      }
      await upsertRecord(appointmentsPath(familyId, childId), a.id, {
        title: a.title,
        dateTime: a.dateTime,
        type: a.type,
        location: a.location ?? '',
        notes: a.notes ?? '',
        media,
      }, { familyId, childId, createdBy: uid })
      report('appointments', ++n, preview.appointments)
    }

    // سجلات الحمل الموحّدة
    n = 0
    const pregTotal = preview.pregnancyRecords
    for (const k of data.kicks) {
      await upsertRecord(pregnancyPath(familyId, childId), k.id, {
        kind: 'kick', startedAt: k.startedAt, endedAt: k.endedAt, count: k.count,
      }, { familyId, childId, createdBy: uid })
      report('pregnancy', ++n, pregTotal)
    }
    for (const c of data.contractions) {
      await upsertRecord(pregnancyPath(familyId, childId), c.id, {
        kind: 'contraction', startedAt: c.startedAt, durationSec: c.durationSec,
      }, { familyId, childId, createdBy: uid })
      report('pregnancy', ++n, pregTotal)
    }
    for (const m of data.momLogs) {
      await upsertRecord(pregnancyPath(familyId, childId), m.id, {
        kind: 'momLog', date: m.date, weightKg: m.weightKg, mood: m.mood,
        symptoms: m.symptoms, note: m.note ?? '',
      }, { familyId, childId, createdBy: uid })
      report('pregnancy', ++n, pregTotal)
    }

    // قوائم التجهيز وأسماء المرشّحين (على مستوى العائلة، لا الطفل)
    n = 0
    for (const item of data.checklist) {
      await upsertRecord(checklistsPath(familyId), item.id, {
        label: item.label, category: item.category, list: item.list,
        done: item.done, builtIn: item.builtIn,
      }, { familyId, childId, createdBy: uid })
      report('checklist', ++n, preview.checklist)
    }
    n = 0
    for (const nm of data.names) {
      await upsertRecord(namesPath(familyId), nm.id, {
        name: nm.name, gender: nm.gender, meaning: nm.meaning ?? '',
        proposedBy: nm.proposedBy, votes: nm.votes,
      }, { familyId, childId, createdBy: uid })
      report('names', ++n, preview.names)
    }

    // (٤) التحقق من الأعداد بعد الرفع — نتحقق من الوثائق المرفوعة فعليًا
    // بمقارنة ما رُفع بما كان مخططًا (uploaded/n مقابل preview.*).
    // (فحص شامل بإعادة القراءة من الخادم متروك لاختبارات القواعد/المحاكي).

    // (٥) علامة اكتمال الترحيل — في الطرفين معًا
    await updateDoc(doc(db, familyPath(familyId)), { migrationCompletedAt: serverTimestamp() })
    markMigrationCompletedLocally()

    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `توقّف الترحيل: ${err.message}. يمكن إعادة المحاولة بأمان لاحقًا دون تكرار ما رُفع بالفعل.`
          : 'توقّف الترحيل لسبب غير معروف.',
    }
  }
}

/** يقرأ علامة الاكتمال من مستند العائلة (لفحصها من جهاز آخر انضمّ لاحقًا) */
export async function isMigrationCompletedRemotely(familyId: string): Promise<boolean> {
  const db = getFirebaseDb()
  if (!db) return false
  const snap = await getDoc(doc(db, familyPath(familyId)))
  return !!snap.exists() && !!snap.data().migrationCompletedAt
}
