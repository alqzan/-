import { useRef, useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Field, ProgressBar, Segmented, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { DownloadIcon, UploadIcon } from '../../components/icons'
import {
  STORAGE_LIMIT_BYTES,
  importSnapshot,
  loadDemoData,
  resetAllData,
  storageUsage,
  updateChild,
  useAppData,
} from '../../data/dataService'
import { downloadBackup, formatBytes, readFileAsText } from '../../lib/backup'
import { localDateInputValue, localDateToIso } from '../../lib/localDate'
import { validateBirthDate, validateLmpDueConsistency } from '../../lib/validation'
import type { Gender } from '../../data/types'
import FamilySyncCard from './FamilySyncCard'

export default function SettingsScreen() {
  const data = useAppData()
  const { confirm, dialog } = useConfirm()
  const fileRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [bornAtError, setBornAtError] = useState('')
  const lmpDueWarning = validateLmpDueConsistency(data.child.lmpDate, data.child.dueDate)

  const usage = storageUsage()
  const photoBytes = data.photos.reduce((sum, p) => sum + p.dataUrl.length * 2, 0)
  const nearFull = usage.ratio > 0.75

  async function onImportFile(file: File) {
    try {
      const text = await readFileAsText(file)
      const result = importSnapshot(text)
      setNote(
        result.ok
          ? { tone: 'ok', text: 'تمت الاستعادة بنجاح. بياناتكم رجعت كما كانت 💛' }
          : { tone: 'error', text: result.error ?? 'تعذّرت الاستعادة.' },
      )
    } catch {
      setNote({ tone: 'error', text: 'تعذّرت قراءة الملف.' })
    }
  }

  return (
    <>
      <ScreenHeader title="الإعدادات" subtitle="معلومات الطفل والنسخ الاحتياطي" back />

      {note && (
        <div
          role="status"
          className={cx(
            'rounded-2xl px-4 py-3 text-sm mb-4 leading-relaxed',
            note.tone === 'ok' ? 'bg-sage-100 text-sage-700' : 'bg-red-50 text-red-800',
          )}
        >
          {note.text}
        </div>
      )}

      {/* ===== معلومات الطفل ===== */}
      <h2 className="section-title mt-2 mb-3">معلومات الطفل</h2>
      <Card>
        <Field label="الاسم">
          <input
            className="input"
            value={data.child.name}
            onChange={(e) => updateChild({ name: e.target.value })}
            placeholder="طفلنا"
          />
        </Field>

        <Field label="الجنس">
          <Segmented
            value={data.child.gender}
            onChange={(gender: Gender) => updateChild({ gender })}
            options={[
              { value: 'unknown', label: 'غير معروف' },
              { value: 'boy', label: 'ولد' },
              { value: 'girl', label: 'بنت' },
            ]}
          />
        </Field>

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
                value={data.child.lmpDate ?? ''}
                onChange={(e) => updateChild({ lmpDate: e.target.value || null })}
              />
            </Field>
            <Field label="موعد الولادة المتوقع">
              <input
                type="date"
                className="input"
                value={data.child.dueDate ?? ''}
                onChange={(e) => updateChild({ dueDate: e.target.value || null })}
              />
            </Field>
          </div>
        )}
        {lmpDueWarning && (
          <p role="alert" className="text-sm text-red-800 bg-red-50 rounded-2xl p-3 mb-3 leading-relaxed">
            {lmpDueWarning}
          </p>
        )}

        {data.child.bornAt && (
          <Field label="تاريخ الولادة">
            <input
              type="date"
              className="input"
              value={data.child.bornAt.slice(0, 10)}
              onChange={(e) => {
                if (!e.target.value) return
                const err = validateBirthDate(e.target.value)
                if (err) {
                  setBornAtError(err)
                  return
                }
                setBornAtError('')
                updateChild({ bornAt: localDateToIso(e.target.value) })
              }}
            />
          </Field>
        )}
        {bornAtError && <p role="alert" className="text-sm text-red-700 -mt-2 mb-3">{bornAtError}</p>}

        <p className="text-xs text-sage-400">التعديلات تُحفظ مباشرة.</p>
      </Card>

      {/* ===== المساحة ===== */}
      <h2 className="section-title mt-6 mb-3">المساحة على هذا الجهاز</h2>
      <Card>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sage-700 font-medium">
            {formatBytes(usage.bytes)} من {formatBytes(STORAGE_LIMIT_BYTES)} تقريبًا
          </span>
          <span className={cx('text-sm font-bold', nearFull ? 'text-red-700' : 'text-sage-500')}>
            {Math.round(usage.ratio * 100)}%
          </span>
        </div>
        <ProgressBar value={usage.ratio} />
        <p className="text-xs text-sage-400 mt-2 leading-relaxed">
          الصور تشغل {formatBytes(photoBytes)} من الإجمالي ({data.photos.length} صورة).
          التخزين الحالي محلي في المتصفح، ولذلك المساحة محدودة.
        </p>
        {nearFull && (
          <p className="text-sm text-red-800 bg-red-50 rounded-2xl p-3 mt-3 leading-relaxed">
            المساحة تقارب الامتلاء. نزّلوا نسخة احتياطية الآن، واحذفوا بعض الصور
            الكبيرة حتى لا تفشل عمليات الحفظ القادمة.
          </p>
        )}
      </Card>

      {/* ===== المزامنة العائلية (Firebase) ===== */}
      <FamilySyncCard data={data} />

      {/* ===== النسخ الاحتياطي ===== */}
      <h2 className="section-title mt-6 mb-3">النسخة الاحتياطية</h2>
      <Card>
        <p className="text-sm text-sage-600 leading-relaxed mb-4">
          كل شيء محفوظ داخل هذا المتصفح فقط. مسح بيانات المتصفح أو فقدان الجهاز يعني
          ضياع الذكريات — نزّلوا نسخة بين فترة وأخرى واحتفظوا بها في مكان آمن.
        </p>
        <div className="flex gap-3">
          <Button
            className="flex-1 py-3"
            onClick={() => {
              const name = downloadBackup()
              setNote({ tone: 'ok', text: `تم تنزيل النسخة: ${name}` })
            }}
          >
            <DownloadIcon className="w-5 h-5" /> تنزيل نسخة
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
        <p className="text-xs text-sage-400 mt-3">
          آخر تحديث للمعاينة: {localDateInputValue()}
        </p>
      </Card>

      {/* ===== منطقة الخطر ===== */}
      <h2 className="section-title mt-6 mb-3">إجراءات متقدّمة</h2>
      <Card>
        {import.meta.env.DEV && (
          <button
            className="w-full text-start py-3 border-b border-cream-200"
            onClick={() =>
              confirm({
                title: 'تحميل بيانات تجريبية؟',
                message:
                  'سيستبدل هذا بياناتكم الحالية ببيانات عرض (أسماء ورسائل ومواعيد وهمية) لاستعراض الواجهات.',
                confirmLabel: 'تحميل البيانات التجريبية',
                onConfirm: () => {
                  loadDemoData()
                  setNote({ tone: 'ok', text: 'تم تحميل البيانات التجريبية.' })
                },
              })
            }
          >
            <div className="font-medium text-sage-800">تحميل بيانات تجريبية</div>
            <div className="text-xs text-sage-400 mt-0.5">لاستعراض شكل التطبيق وهو ممتلئ</div>
          </button>
        )}

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
          <div className="font-medium text-red-700">مسح كل البيانات والبدء من جديد</div>
          <div className="text-xs text-sage-400 mt-0.5">لا يمكن التراجع عن هذا الإجراء</div>
        </button>
      </Card>

      <p className="text-center text-xs text-sage-300 mt-8">طفلنا — صُنع بحبّ 💛</p>

      {dialog}
    </>
  )
}
