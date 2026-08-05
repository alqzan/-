import { useMemo, useState } from 'react'
import { Button, Card, Field, FieldGroup, Segmented } from '../../components/ui'
import { EmbraceMark } from '../../components/illustrations'
import { completeSetup } from '../../data/dataService'
import { localDateToIso } from '../../lib/localDate'
import type { Gender } from '../../data/types'

type Stage = 'pregnancy' | 'born'

export default function Onboarding() {
  const [stage, setStage] = useState<Stage>('pregnancy')
  const [childName, setChildName] = useState('')
  const [momName, setMomName] = useState('')
  const [dadName, setDadName] = useState('')
  const [gender, setGender] = useState<Gender>('unknown')
  const [lmpDate, setLmpDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [bornAt, setBornAt] = useState('')
  const [error, setError] = useState('')

  const canSubmit = useMemo(
    () => (stage === 'pregnancy' ? Boolean(lmpDate || dueDate) : Boolean(bornAt)),
    [stage, lmpDate, dueDate, bornAt],
  )

  function submit() {
    if (!canSubmit) {
      setError(stage === 'pregnancy' ? 'أدخلوا تاريخ آخر دورة أو موعد الولادة المتوقع.' : 'أدخلوا تاريخ الولادة.')
      return
    }
    // نحوّل قيمة حقل التاريخ ("YYYY-MM-DD") إلى ظهر اليوم بالتوقيت المحلي.
    // القراءة الخام كانت تُفسَّر كمنتصف ليل UTC، فيظهر عمر الطفل ناقصًا يومًا
    // لمن يعيش في توقيت سالب — والإعدادات كانت تحفظ بصيغة مختلفة عن هنا.
    void completeSetup({
      name: childName.trim() || 'طفلنا',
      gender,
      lmpDate: stage === 'pregnancy' && lmpDate ? localDateToIso(lmpDate) : null,
      dueDate: stage === 'pregnancy' && dueDate ? localDateToIso(dueDate) : null,
      bornAt: stage === 'born' && bornAt ? localDateToIso(bornAt) : null,
      photo: null,
      parents: {
        momName: momName.trim() || 'ماما',
        dadName: dadName.trim() || 'بابا',
      },
    })
  }

  return (
    <div
      className="min-h-dvh bg-gradient-to-b from-paper-100 via-paper-50 to-paper-100 px-5"
      style={{
        // شاشة البداية خارج app-shell، فتحمل إزاحة الشقّ بنفسها:
        // بدونها يختفي شعار التطبيق وعنوانه خلف شريط الحالة على الجوال.
        paddingTop: 'calc(2rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto max-w-[27rem]">
        <div className="text-center mb-8">
          <EmbraceMark className="w-28 h-20 mx-auto text-clay-300" />
          <p className="eyebrow mt-4">طفلنا</p>
          <h1 className="title-lg mt-2">نبدأ الحكاية</h1>
          <p className="text-ink-500 mt-2.5 leading-relaxed text-[15px]">
            مكان واحد يحفظ الرحلة والرسائل والصور — من قبل ما يجي، إلى ما بعد ما يكبر.
          </p>
        </div>

        <Card>
          <FieldGroup label="أين تبدأ قصتكم؟">
            <Segmented
              value={stage}
              onChange={setStage}
              options={[
                { value: 'pregnancy', label: 'أثناء الحمل' },
                { value: 'born', label: 'بعد الولادة' },
              ]}
            />
          </FieldGroup>
          <Field label="اسم الطفل أو الاسم المؤقت">
            <input className="input" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="طفلنا" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم ماما">
              <input className="input" value={momName} onChange={(e) => setMomName(e.target.value)} placeholder="ماما" />
            </Field>
            <Field label="اسم بابا">
              <input className="input" value={dadName} onChange={(e) => setDadName(e.target.value)} placeholder="بابا" />
            </Field>
          </div>
          <FieldGroup label="الجنس (اختياري)">
            <Segmented
              value={gender}
              onChange={setGender}
              options={[
                { value: 'unknown', label: 'غير معروف' },
                { value: 'boy', label: 'ولد' },
                { value: 'girl', label: 'بنت' },
              ]}
            />
          </FieldGroup>

          {stage === 'pregnancy' ? (
            <>
              <Field label="تاريخ آخر دورة (اختياري إذا عُرف الموعد المتوقع)">
                <input type="date" className="input" value={lmpDate} onChange={(e) => setLmpDate(e.target.value)} />
              </Field>
              <Field label="موعد الولادة المتوقع (اختياري إذا أُدخل تاريخ آخر دورة)">
                <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </>
          ) : (
            <Field label="تاريخ الولادة">
              <input type="date" className="input" value={bornAt} onChange={(e) => setBornAt(e.target.value)} />
            </Field>
          )}

          {error && (
            <p role="alert" className="text-sm text-clay-700 bg-clay-50 border border-clay-100 rounded-2xl p-3.5 mb-4">
              {error}
            </p>
          )}
          <Button className="w-full py-3" onClick={submit}>
            ابدأوا الحكاية
          </Button>
          <p className="text-[12px] text-ink-400 text-center mt-3.5">
            كل هذي المعلومات تتعدّل لاحقًا من الإعدادات.
          </p>
        </Card>
      </div>
    </div>
  )
}
