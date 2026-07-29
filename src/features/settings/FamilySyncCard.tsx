import { useState } from 'react'
import { Button, Card, Field, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import type { AppData } from '../../data/types'
import { isFirebaseConfigured } from '../../firebase/config'
import {
  buildInviteLink,
  createFamily,
  ensureAnonymousAuth,
  getLocalFamilyId,
  joinFamily,
} from '../../firebase/auth'
import {
  buildMigrationPreview,
  isMigrationCompletedLocally,
  migrateToFirebase,
  type MigrationProgress,
} from '../../firebase/migration'

/** معرّف الطفل المحلي الثابت — يُستخدم كمعرّف مستند Firestore، فيبقى
 *  ثابتًا بين محاولات الترحيل (استئناف آمن دون تكرار). */
const LOCAL_CHILD_ID_KEY = 'tafalna:local-child-id'
function getOrCreateLocalChildId(): string {
  try {
    let id = localStorage.getItem(LOCAL_CHILD_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(LOCAL_CHILD_ID_KEY, id)
    }
    return id
  } catch {
    return 'local-child'
  }
}

interface Props {
  data: AppData
}

export default function FamilySyncCard({ data }: Props) {
  const { confirm, dialog } = useConfirm()
  const [familyId, setFamilyId] = useState<string | null>(getLocalFamilyId())
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinFamilyIdInput, setJoinFamilyIdInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const [migrated, setMigrated] = useState(isMigrationCompletedLocally())

  if (!isFirebaseConfigured) {
    return (
      <>
        <h2 className="section-title mt-6 mb-3">المزامنة العائلية</h2>
        <Card>
          <p className="text-sm text-sage-600 leading-relaxed">
            المزامنة بين جهازي الوالدين عبر السحابة غير مفعّلة بعد على هذا البناء
            (لا توجد إعدادات Firebase مضبوطة). التطبيق يعمل بكامل ميزاته محليًا كما هو.
          </p>
        </Card>
      </>
    )
  }

  async function onCreateFamily() {
    setBusy(true)
    setNote(null)
    try {
      const { familyId: fid, joinCode } = await createFamily('عائلتنا', 'أنا')
      setFamilyId(fid)
      setInviteLink(buildInviteLink(fid, joinCode))
      setNote({ tone: 'ok', text: `تم إنشاء العائلة. الكود: ${joinCode} (يُعرض مرّة واحدة فقط)` })
    } catch (err) {
      setNote({ tone: 'error', text: err instanceof Error ? err.message : 'تعذّر إنشاء العائلة.' })
    } finally {
      setBusy(false)
    }
  }

  async function onJoinFamily() {
    if (!joinFamilyIdInput.trim() || !joinCodeInput.trim()) return
    setBusy(true)
    setNote(null)
    try {
      await joinFamily(joinFamilyIdInput.trim(), joinCodeInput.trim(), 'أنا')
      setFamilyId(joinFamilyIdInput.trim())
      setNote({ tone: 'ok', text: 'انضممتم للعائلة بنجاح.' })
    } catch {
      setNote({
        tone: 'error',
        text: 'تعذّر الانضمام — تأكدوا من صحة الكود ومعرّف العائلة، أو أن الكود لم تنتهِ صلاحيته.',
      })
    } finally {
      setBusy(false)
    }
  }

  const preview = buildMigrationPreview(data)

  async function onMigrate() {
    if (!familyId) return
    setBusy(true)
    setProgress(null)
    setNote(null)
    try {
      const user = await ensureAnonymousAuth()
      const childId = getOrCreateLocalChildId()
      const result = await migrateToFirebase(data, familyId, childId, user.uid, setProgress)
      if (result.ok) {
        setMigrated(true)
        setNote({ tone: 'ok', text: 'اكتمل الترحيل إلى السحابة بنجاح. البيانات المحلية لم تُحذف.' })
      } else {
        setNote({ tone: 'error', text: result.error })
      }
    } catch (err) {
      setNote({ tone: 'error', text: err instanceof Error ? err.message : 'تعذّر إكمال الترحيل.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2 className="section-title mt-6 mb-3">المزامنة العائلية</h2>
      {note && (
        <div
          role="status"
          className={cx(
            'rounded-2xl px-4 py-3 text-sm mb-3 leading-relaxed',
            note.tone === 'ok' ? 'bg-sage-100 text-sage-700' : 'bg-red-50 text-red-800',
          )}
        >
          {note.text}
        </div>
      )}
      <Card>
        {!familyId ? (
          <>
            <p className="text-sm text-sage-600 leading-relaxed mb-4">
              اربطوا جهازي الوالدين معًا: أنشئوا عائلة من جهاز واحد واحصلوا على كود قصير،
              ثم أدخلوه من الجهاز الآخر. لا حاجة لبريد إلكتروني أو كلمة مرور.
            </p>
            <Button className="w-full py-3 mb-4" onClick={onCreateFamily} disabled={busy}>
              إنشاء عائلة جديدة
            </Button>
            <p className="text-xs text-sage-400 mb-2">أو انضمّوا بكود موجود:</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="معرّف العائلة">
                <input
                  className="input"
                  value={joinFamilyIdInput}
                  onChange={(e) => setJoinFamilyIdInput(e.target.value)}
                />
              </Field>
              <Field label="الكود">
                <input
                  className="input"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                />
              </Field>
            </div>
            <Button variant="ghost" className="w-full py-3" onClick={onJoinFamily} disabled={busy}>
              انضمام
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-sage-700 mb-2">
              متصلون بعائلة: <span className="font-mono text-xs">{familyId}</span>
            </p>
            {inviteLink && (
              <p className="text-xs text-sage-400 mb-3 break-all leading-relaxed">
                رابط الدعوة (شاركوه مرّة واحدة، لا يُعرض لاحقًا): {inviteLink}
              </p>
            )}
            <div className="border-t border-cream-200 pt-4 mt-2">
              <p className="text-sm text-sage-600 leading-relaxed mb-3">
                ترحيل البيانات المحلية إلى السحابة (نسخة احتياطية تلقائية تُنزَّل أولًا):
                {' '}
                {preview.children} ملف طفل، {preview.memories} ذكرى ({preview.media} صورة)،
                {' '}
                {preview.feedings + preview.diapers + preview.sleep + preview.growth} سجل رعاية،
                {' '}
                {preview.vaccinations} جرعة تطعيم، {preview.appointments} موعد.
              </p>
              {progress && (
                <p className="text-xs text-sage-400 mb-2">
                  {progress.step}: {progress.done}/{progress.total}
                </p>
              )}
              <Button
                className="w-full py-3"
                disabled={busy}
                onClick={() =>
                  confirm({
                    title: migrated ? 'إعادة الترحيل؟' : 'ترحيل البيانات إلى السحابة؟',
                    message: migrated
                      ? 'تم الترحيل من قبل. إعادة المحاولة آمنة ولن تكرر السجلات المرفوعة مسبقًا.'
                      : 'سيُنزَّل نسخة احتياطية محلية أولًا، ثم تُرفع بياناتكم للسحابة. البيانات المحلية تبقى كما هي.',
                    confirmLabel: 'ابدأوا الترحيل',
                    onConfirm: () => void onMigrate(),
                  })
                }
              >
                {migrated ? 'إعادة الترحيل (آمن)' : 'ترحيل البيانات الآن'}
              </Button>
            </div>
          </>
        )}
      </Card>
      {dialog}
    </>
  )
}
