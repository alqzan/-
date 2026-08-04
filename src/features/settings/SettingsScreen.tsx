import { useEffect, useRef, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Field, FieldGroup, ProgressBar, Segmented, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { DownloadIcon, UploadIcon } from '../../components/icons'
import {
  STORAGE_LIMIT_BYTES,
  importSnapshot,
  loadDemoData,
  resetAllData,
  updateChild,
  useAppData,
  useStorageUsage,
} from '../../data/dataService'
import { downloadBackup, formatBytes, readFileAsText } from '../../lib/backup'
import { photoBytes as photoSize } from '../../lib/image'
import { inlineVoiceBytes } from '../../lib/audio'
import { audioUsage } from '../../data/mediaStore'
import { localDateInputValue, localDateToIso } from '../../lib/localDate'
import type { Gender } from '../../data/types'

/**
 * يحوّل تاريخًا مخزّنًا (ISO أو "YYYY-MM-DD" من نسخة قديمة) إلى قيمة
 * حقل `<input type="date">` بالتوقيت المحلي. الاقتطاع المباشر للنص لا يكفي:
 * ISO مكتوب بتوقيت UTC، فقد يقع في يوم مختلف عن اليوم الذي اختاره المستخدم.
 */
function dateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : localDateInputValue(d)
}

export default function SettingsScreen() {
  const data = useAppData()
  const { confirm, dialog } = useConfirm()
  const fileRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [backingUp, setBackingUp] = useState(false)

  const usage = useStorageUsage()
  const photoBytes = data.photos.reduce((sum, p) => sum + photoSize(p), 0)
  // التسجيلات خارج حصّة localStorage: نقرأ حجمها من مخزن الوسائط مباشرة
  const [mediaBytes, setMediaBytes] = useState(0)
  useEffect(() => {
    let alive = true
    void audioUsage().then((bytes) => {
      if (alive) setMediaBytes(bytes)
    })
    return () => {
      alive = false
    }
  }, [data.voices])
  const audioBytes =
    mediaBytes + data.voices.reduce((sum, v) => sum + inlineVoiceBytes(v), 0)
  const nearFull = usage.ratio > 0.75

  async function onImportFile(file: File) {
    try {
      const text = await readFileAsText(file)
      const result = await importSnapshot(text)
      setNote(
        result.ok
          ? { tone: 'ok', text: 'تمت الاستعادة بنجاح — بياناتكم رجعت كما كانت.' }
          : { tone: 'error', text: result.error ?? 'تعذّرت الاستعادة.' },
      )
    } catch {
      setNote({ tone: 'error', text: 'تعذّرت قراءة الملف.' })
    }
  }

  return (
    <>
      <ScreenHeader title="الإعدادات" subtitle="معلومات الطفل وحماية الذكريات" back={false} />

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

      {/* ===== معلومات الطفل ===== */}
      <div className="eyebrow mb-2.5">معلومات الطفل</div>
      <Card>
        <Field label="الاسم">
          <input
            className="input"
            value={data.child.name}
            onChange={(e) => updateChild({ name: e.target.value })}
            placeholder="طفلنا"
          />
        </Field>

        <FieldGroup label="الجنس">
          <Segmented
            value={data.child.gender}
            onChange={(gender: Gender) => updateChild({ gender })}
            options={[
              { value: 'unknown', label: 'غير معروف' },
              { value: 'boy', label: 'ولد' },
              { value: 'girl', label: 'بنت' },
            ]}
          />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <Field label="اسم ماما">
            <input
              className="input"
              value={data.child.parents.momName}
              onChange={(e) =>
                updateChild({ parents: { ...data.child.parents, momName: e.target.value } })
              }
              placeholder="ماما"
            />
          </Field>
          <Field label="اسم بابا">
            <input
              className="input"
              value={data.child.parents.dadName}
              onChange={(e) =>
                updateChild({ parents: { ...data.child.parents, dadName: e.target.value } })
              }
              placeholder="بابا"
            />
          </Field>
        </div>

        {!data.child.bornAt && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ آخر دورة">
              <input
                type="date"
                className="input"
                value={dateInput(data.child.lmpDate)}
                onChange={(e) =>
                  updateChild({ lmpDate: e.target.value ? localDateToIso(e.target.value) : null })
                }
              />
            </Field>
            <Field label="موعد الولادة المتوقع">
              <input
                type="date"
                className="input"
                value={dateInput(data.child.dueDate)}
                onChange={(e) =>
                  updateChild({ dueDate: e.target.value ? localDateToIso(e.target.value) : null })
                }
              />
            </Field>
          </div>
        )}

        {data.child.bornAt && (
          <Field label="تاريخ الولادة">
            <input
              type="date"
              className="input"
              value={dateInput(data.child.bornAt)}
              onChange={(e) =>
                updateChild({
                  bornAt: e.target.value ? localDateToIso(e.target.value) : data.child.bornAt,
                })
              }
            />
          </Field>
        )}

        <p className="text-xs text-ink-400">التعديلات تُحفظ مباشرة.</p>
      </Card>

      {/* ===== المساحة ===== */}
      <div className="eyebrow mb-2.5 mt-7">المساحة على هذا الجهاز</div>
      <Card>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-ink-800 font-medium">
            {formatBytes(usage.bytes)} من {formatBytes(STORAGE_LIMIT_BYTES)} تقريبًا
          </span>
          <span className={cx('text-sm font-bold tnum', nearFull ? 'text-clay-600' : 'text-ink-500')}>
            {Math.round(usage.ratio * 100)}%
          </span>
        </div>
        <ProgressBar value={usage.ratio} />
        <p className="text-xs text-ink-400 mt-2 leading-relaxed">
          الصور تشغل {formatBytes(photoBytes)} من هذه الحصّة ({data.photos.length} صورة).
          التسجيلات الصوتية ({data.voices.length}) محفوظة في مخزن منفصل أوسع بكثير
          وتشغل {formatBytes(audioBytes)}، فلا تزاحم بقية البيانات.
        </p>
        {nearFull && (
          <p className="text-sm text-clay-700 bg-clay-50 rounded-2xl p-3 mt-3 leading-relaxed">
            المساحة تقارب الامتلاء. نزّلوا نسخة احتياطية الآن، واحذفوا بعض الصور
            الكبيرة حتى لا تفشل عمليات الحفظ القادمة.
          </p>
        )}
      </Card>

      {/* ===== النسخ الاحتياطي ===== */}
      <div className="eyebrow mb-2.5 mt-7">النسخة الاحتياطية</div>
      <Card>
        <p className="text-sm text-ink-600 leading-relaxed mb-4">
          كل شيء محفوظ داخل هذا المتصفح فقط. مسح بيانات المتصفح أو فقدان الجهاز يعني
          ضياع الذكريات — نزّلوا نسخة بين فترة وأخرى واحتفظوا بها في مكان آمن.
        </p>
        <div className="flex gap-3">
          <Button
            className="flex-1 py-3"
            disabled={backingUp}
            onClick={async () => {
              setBackingUp(true)
              try {
                const name = await downloadBackup()
                setNote({ tone: 'ok', text: `تم تنزيل النسخة: ${name}` })
              } catch {
                setNote({ tone: 'error', text: 'تعذّر تجهيز النسخة الاحتياطية.' })
              } finally {
                setBackingUp(false)
              }
            }}
          >
            <DownloadIcon className="w-5 h-5" /> {backingUp ? 'جارٍ التجهيز…' : 'تنزيل نسخة'}
          </Button>
          <Button variant="ghost" className="flex-1 py-3" onClick={() => fileRef.current?.click()}>
            <UploadIcon className="w-5 h-5" /> استعادة
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              confirm({
                title: 'استعادة نسخة احتياطية؟',
                message:
                  'الاستعادة تستبدل كل البيانات الحالية على هذا الجهاز بمحتوى الملف. ننصح بتنزيل نسخة من الوضع الحالي أولًا.',
                confirmLabel: 'استبدال البيانات',
                onConfirm: () => void onImportFile(f),
              })
            }
            e.target.value = ''
          }}
        />
      </Card>

      {/* ===== منطقة الخطر ===== */}
      <div className="eyebrow mb-2.5 mt-7">إجراءات متقدّمة</div>
      <Card>
        <button
          className="w-full text-start py-3 border-b border-paper-200"
          onClick={() =>
            confirm({
              title: 'تحميل بيانات تجريبية؟',
              message:
                'سيستبدل هذا بياناتكم الحالية ببيانات عرض (أسماء ورسائل ومواعيد وهمية) لاستعراض الواجهات.',
              confirmLabel: 'تحميل البيانات التجريبية',
              onConfirm: () => {
                void loadDemoData()
                setNote({ tone: 'ok', text: 'تم تحميل البيانات التجريبية.' })
              },
            })
          }
        >
          <div className="font-medium text-ink-900">تحميل بيانات تجريبية</div>
          <div className="text-xs text-ink-400 mt-0.5">لاستعراض شكل التطبيق وهو ممتلئ</div>
        </button>

        <button
          className="w-full text-start py-3"
          onClick={() =>
            confirm({
              title: 'مسح كل البيانات؟',
              message:
                'سيُحذف كل شيء نهائيًا: الصور، الرسائل، الكبسولات، المعالم، والمواعيد. لا يمكن التراجع. نزّلوا نسخة احتياطية أولًا إن أردتم الاحتفاظ بها.',
              confirmLabel: 'نعم، امسح كل شيء',
              onConfirm: () => resetAllData(),
            })
          }
        >
          <div className="font-medium text-clay-600">مسح كل البيانات والبدء من جديد</div>
          <div className="text-xs text-ink-400 mt-0.5">لا يمكن التراجع عن هذا الإجراء</div>
        </button>
      </Card>

      <p className="text-center text-[11px] text-ink-300 mt-10">طفلنا — كل ذكرى تستاهل تنكتب</p>

      {dialog}
    </>
  )
}
