import { useState } from 'react'
import { Button, Card, Field, cx } from '../../components/ui'
import { CheckIcon, CopyIcon, SyncIcon } from '../../components/icons'
import {
  createFamilySync,
  joinFamilySync,
  stopFamilySync,
  useFamilySyncState,
} from '../../data/familySync'
import { FAMILY_CODE_LENGTH } from '../../lib/familyCode'
import { isFirebaseConfigured } from '../../lib/firebase'
import { relativeFromNow } from '../../lib/format'
import { useNow } from '../../lib/useNow'

/**
 * بطاقة مزامنة العائلة — الإعدادات.
 *
 * محلي أولًا دائمًا: هذه البطاقة تربط جهازًا بآخر عبر Firestore، ولا
 * تلمس الصور ولا التسجيلات الصوتية إطلاقًا — تلك تبقى على كل جهاز
 * وحده. راجع FIREBASE.md وFAMILY_SYNC.md.
 */
export default function FamilySyncCard() {
  const sync = useFamilySyncState()
  const configured = isFirebaseConfigured()
  const now = useNow(30_000)

  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  async function onCreate() {
    setBusy('create')
    setNote(null)
    const result = await createFamilySync()
    setBusy(null)
    if (!result.ok) setNote({ tone: 'error', text: result.error ?? 'تعذّر إنشاء المزامنة.' })
  }

  async function onJoin() {
    if (!joinCode.trim()) return
    setBusy('join')
    setNote(null)
    const result = await joinFamilySync(joinCode)
    setBusy(null)
    if (result.ok) {
      setShowJoin(false)
      setJoinCode('')
    } else {
      setNote({ tone: 'error', text: result.error ?? 'تعذّر الربط.' })
    }
  }

  async function onCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setNote({ tone: 'error', text: 'تعذّر النسخ التلقائي — انسخوا الرمز يدويًا.' })
    }
  }

  return (
    <>
      <div className="eyebrow mb-2.5 mt-7">مزامنة العائلة</div>
      <Card>
        {!configured && (
          <p className="text-sm text-ink-500 leading-relaxed mb-4 bg-paper-200 rounded-2xl p-3">
            المزامنة بين الأجهزة غير مُفعّلة في هذا الإصدار من التطبيق بعد.
          </p>
        )}

        {note && (
          <div
            role="status"
            className={cx(
              'rounded-2xl px-4 py-3 text-sm mb-4 leading-relaxed',
              note.tone === 'ok' ? 'bg-paper-200 text-ink-800' : 'bg-clay-50 text-clay-700',
            )}
          >
            {note.text}
          </div>
        )}

        {sync.status === 'connected' && sync.code ? (
          <ConnectedView
            code={sync.code}
            lastSyncedAt={sync.lastSyncedAt}
            now={now}
            copied={copied}
            onCopy={() => void onCopy(sync.code!)}
            onStop={() => {
              stopFamilySync()
              setNote(null)
            }}
          />
        ) : (
          <>
            <p className="text-sm text-ink-600 leading-relaxed mb-4">
              اربطوا جهاز الأم وجهاز الأب معًا: كل ما يكتبه أحدكم (اليوميات، المواعيد،
              المعالم، والسجلّات) يصل تلقائيًا إلى الآخر. الصور والتسجيلات الصوتية تبقى
              على جهازها فقط ولا تُرفع أبدًا.
            </p>

            <div className="flex gap-3 mb-3">
              <Button
                className="flex-1 py-3"
                disabled={!configured || busy !== null}
                onClick={() => void onCreate()}
              >
                <SyncIcon className="w-5 h-5" />
                {busy === 'create' ? 'جارٍ الإنشاء…' : 'إنشاء مزامنة عائلية'}
              </Button>
              <Button
                variant="ghost"
                className="flex-1 py-3"
                disabled={!configured || busy !== null}
                onClick={() => setShowJoin((v) => !v)}
              >
                ربط جهاز آخر
              </Button>
            </div>

            {showJoin && (
              <div className="mt-2">
                <Field label={`رمز الربط (${FAMILY_CODE_LENGTH} حرفًا)`}>
                  <input
                    className="input font-mono text-sm tracking-tight"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="الصقوا الرمز الذي شاركه الطرف الآخر"
                    dir="ltr"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </Field>
                <Button
                  className="w-full py-3"
                  disabled={busy !== null || !joinCode.trim()}
                  onClick={() => void onJoin()}
                >
                  {busy === 'join' ? 'جارٍ الربط…' : 'ربط بهذا الرمز'}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  )
}

function ConnectedView({
  code,
  lastSyncedAt,
  now,
  copied,
  onCopy,
  onStop,
}: {
  code: string
  lastSyncedAt: string | null
  now: number
  copied: boolean
  onCopy: () => void
  onStop: () => void
}) {
  return (
    <>
      <div className="flex items-center gap-2 text-ink-800 mb-3">
        <span className="w-2 h-2 rounded-full bg-moss-500 shrink-0" aria-hidden="true" />
        <span className="font-medium">متصل بمزامنة عائلية</span>
      </div>

      <p className="text-xs text-ink-400 mb-3">
        {lastSyncedAt
          ? `آخر تحديث ${relativeFromNow(lastSyncedAt, new Date(now))}`
          : 'بانتظار أول مزامنة…'}
      </p>

      <div className="label mb-1.5">رمز الربط — شاركوه مع الطرف الآخر</div>
      <div className="flex items-stretch gap-2 mb-4">
        <div
          dir="ltr"
          className="flex-1 min-w-0 rounded-2xl bg-paper-200 px-3 py-2.5 text-xs font-mono
                     text-ink-700 leading-relaxed break-all select-all"
        >
          {code}
        </div>
        <button
          onClick={onCopy}
          className="w-11 h-11 shrink-0 grid place-items-center rounded-2xl bg-paper-200 text-ink-600"
          aria-label="نسخ رمز الربط"
        >
          {copied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
        </button>
      </div>

      <Button variant="ghost" className="w-full py-3" onClick={onStop}>
        إيقاف المزامنة على هذا الجهاز
      </Button>
      <p className="text-xs text-ink-400 mt-2 leading-relaxed">
        الإيقاف لا يحذف أي شيء: بياناتكم على هذا الجهاز تبقى كما هي، والعائلة السحابية
        تبقى موجودة إن أردتم العودة إليها لاحقًا.
      </p>
    </>
  )
}
