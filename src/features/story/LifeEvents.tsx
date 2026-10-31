import { useCallback, useRef, useState } from 'react'
import { Button, Field, Sheet } from '../../components/ui'
import { addMilestoneAchieved } from '../../data/dataService'
import type { Milestone } from '../../data/types'
import { localDateInputValue, localDateToIso } from '../../lib/localDate'

export type LifeEventStage = 'pregnancy' | 'child'

export interface LifeEventPreset {
  id: string
  title: string
  repeatable?: boolean
}

const PRESETS: Record<LifeEventStage, LifeEventPreset[]> = {
  pregnancy: [
    { id: 'ultrasound', title: 'أول سونار' },
    { id: 'gender-reveal', title: 'معرفة جنس الجنين' },
  ],
  child: [
    { id: 'first-step', title: 'أول خطوة' },
    { id: 'birthday', title: 'عيد ميلاد', repeatable: true },
  ],
}

function normalizedTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ar')
}

export function lifeEventPresets(
  stage: LifeEventStage,
  milestones: Milestone[],
  includePregnancy = false,
): LifeEventPreset[] {
  const recorded = new Set(
    milestones.filter((milestone) => milestone.achievedAt).map((milestone) => normalizedTitle(milestone.title)),
  )
  const available = stage === 'child' && includePregnancy
    ? [...PRESETS.child, ...PRESETS.pregnancy]
    : PRESETS[stage]
  return available.filter(
    (preset) => preset.repeatable || !recorded.has(normalizedTitle(preset.title)),
  )
}

/**
 * اختصارات صغيرة للمحطات التي يريد الوالدان توثيقها يدويًا. كل ضغطة تفتح
 * نافذة التاريخ والذكرى؛ لا تُستنتج أي محطة من بيانات الطفل وحدها.
 */
export default function LifeEvents({
  stage,
  milestones,
}: {
  stage: LifeEventStage
  milestones: Milestone[]
}) {
  const [selected, setSelected] = useState<LifeEventPreset | null>(null)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [showPregnancy, setShowPregnancy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const savingRef = useRef(false)

  const close = useCallback(() => {
    if (savingRef.current) return
    setSelected(null)
    setError('')
  }, [])

  function openEvent(preset: LifeEventPreset) {
    setSelected(preset)
    setDate(localDateInputValue())
    setNote('')
    setCustomTitle('')
    setError('')
  }

  const isCustom = selected?.id === 'custom'
  const eventTitle = isCustom ? customTitle.trim() : selected?.title.trim() ?? ''

  async function save() {
    if (!selected || savingRef.current || !eventTitle || !date) return
    if (!isValidLocalDate(date)) {
      setError('اختاروا تاريخًا صحيحًا.')
      return
    }
    if (date > localDateInputValue()) {
      setError('اختاروا تاريخًا وقع بالفعل.')
      return
    }
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const saved = await addMilestoneAchieved(
        eventTitle,
        localDateToIso(date),
        note.trim() || undefined,
      )
      if (!saved) {
        setError('لم يُحفظ الحدث. بقيت تفاصيله هنا؛ حاولوا مرة أخرى.')
        return
      }
      setSelected(null)
    } catch {
      setError('لم يُحفظ الحدث. بقيت تفاصيله هنا؛ حاولوا مرة أخرى.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const presets = lifeEventPresets(stage, milestones, showPregnancy)

  return (
    <section aria-labelledby="life-events-heading" className="mt-4 mb-5">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div>
          <h2 id="life-events-heading" className="font-display font-bold text-[16px] text-ink-900">
            محطات كبيرة
          </h2>
          <p className="text-[12px] text-ink-400 mt-0.5">سجّلوا ما حدث فعلًا، بتاريخ وذكرى.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="محطات مقترحة">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => openEvent(preset)}
            className="shrink-0 rounded-2xl border border-line bg-paper-100 px-3.5 py-2.5 text-[13px] font-medium text-ink-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay-500"
          >
            {preset.title}
          </button>
        ))}
        {stage === 'child' && (
          <button
            type="button"
            onClick={() => setShowPregnancy((shown) => !shown)}
            aria-expanded={showPregnancy}
            className="shrink-0 rounded-2xl border border-line bg-paper-100 px-3.5 py-2.5 text-[13px] font-medium text-ink-500 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay-500"
          >
            {showPregnancy ? 'إخفاء محطات الحمل' : 'محطات الحمل'}
          </button>
        )}
        <button
          type="button"
          onClick={() => openEvent({ id: 'custom', title: '' })}
          className="shrink-0 rounded-2xl border border-clay-200 bg-clay-50 px-3.5 py-2.5 text-[13px] font-medium text-clay-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay-500"
        >
          حدث خاص
        </button>
      </div>

      <Sheet
        open={!!selected}
        onClose={close}
        title={isCustom ? 'حدث خاص' : selected?.title ?? ''}
        subtitle="اختاروا يوم الحدث، وأضيفوا ذكرى إن أحببتم."
      >
        {selected && (
          <>
            {isCustom && (
              <Field label="اسم الحدث">
                <input
                  className="input"
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  placeholder="مثل: أول يوم في الحضانة"
                  autoFocus
                />
              </Field>
            )}
            <Field label="تاريخ الحدث">
              <input
                type="date"
                className="input"
                value={date}
                max={localDateInputValue()}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field label="ذكرى عن اللحظة (اختياري)">
              <textarea
                className="input font-serif leading-[1.9] min-h-[6rem]"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="كيف كانت اللحظة؟"
              />
            </Field>
            {error && <p role="alert" className="text-[13px] text-clay-700 mb-3">{error}</p>}
            <Button
              className="w-full"
              onClick={() => void save()}
              disabled={saving || !date || !eventTitle}
            >
              {saving ? 'جارٍ الحفظ…' : 'احفظوا الحدث'}
            </Button>
          </>
        )}
      </Sheet>
    </section>
  )
}

function isValidLocalDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const parsed = new Date(year, month - 1, day)
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
}
