import { useMemo, useState } from 'react'
import { Button, Card, Field, FieldGroup, Segmented } from '../../components/ui'
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
    <div className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-sage-50 px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🤍</div>
          <h1 className="text-3xl font-extrabold text-sage-800">نبدأ قصة طفلنا</h1>
          <p className="text-sage-500 mt-2 leading-relaxed">
            مكان خاص يحفظ الرحلة والرسائل والصور الجميلة منذ البداية.
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

          {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-2xl p-3 mb-3">{error}</p>}
          <Button className="w-full py-3" onClick={submit}>ابدأوا القصة</Button>
          <p className="text-xs text-sage-400 text-center mt-3">يمكن تعديل هذه المعلومات لاحقًا.</p>
        </Card>
      </div>
    </div>
  )
}
