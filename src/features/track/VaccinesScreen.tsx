import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Field, ProgressBar, Sheet, cx } from '../../components/ui'
import { useConfirm } from '../../components/Confirm'
import { CheckIcon, PlusIcon, SyringeIcon, TrashIcon } from '../../components/icons'
import {
  addVaccine,
  deleteVaccine,
  setVaccineGiven,
  useAppData,
} from '../../data/dataService'
import { formatShortDate } from '../../lib/format'
import { ageInMonths, localDateInputValue, localDateToIso } from '../../lib/localDate'
import type { VaccineDose } from '../../data/types'

function groupLabel(months: number): string {
  if (months === 0) return 'عند الولادة'
  if (months < 12) return `عمر ${months} أشهر`
  if (months === 12) return 'عمر سنة'
  if (months === 18) return 'عمر سنة ونصف'
  if (months % 12 === 0) return `عمر ${months / 12} سنوات`
  return `عمر ${months} شهرًا`
}

export default function VaccinesScreen() {
  const data = useAppData()
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<VaccineDose | null>(null)
  const { confirm, dialog } = useConfirm()

  const bornAt = data.child.bornAt
  const months = bornAt ? ageInMonths(bornAt) : null
  const given = data.vaccines.filter((v) => v.givenAt).length

  // تجميع حسب العمر المستحق
  const groups = new Map<number, VaccineDose[]>()
  for (const v of [...data.vaccines].sort((a, b) => a.dueMonths - b.dueMonths)) {
    if (!groups.has(v.dueMonths)) groups.set(v.dueMonths, [])
    groups.get(v.dueMonths)!.push(v)
  }

  const current = selected
    ? (data.vaccines.find((v) => v.id === selected.id) ?? null)
    : null

  return (
    <>
      <ScreenHeader
        title="التطعيمات"
        subtitle={`${given} من ${data.vaccines.length} مُعطاة`}
        back
        action={
          <button
            onClick={() => setAddOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-clay-500 text-white shadow-lift"
            aria-label="إضافة تطعيم"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <Card className="mb-4">
        <ProgressBar value={data.vaccines.length ? given / data.vaccines.length : 0} />
        <p className="text-sm text-clay-700 bg-clay-50 rounded-2xl p-3 mt-3 leading-relaxed">
          <span className="font-bold">تنبيه:</span> هذا جدول استرشادي للتذكير فقط.
          المرجع هو بطاقة التطعيم الرسمية وتعليمات المركز الصحي — راجعوهما دائمًا.
        </p>
      </Card>

      {[...groups.entries()].map(([dueMonths, doses]) => {
        const due = months != null && months >= dueMonths
        const allGiven = doses.every((d) => d.givenAt)
        return (
          <div key={dueMonths} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="section-title mb-0">{groupLabel(dueMonths)}</h2>
              {due && !allGiven && (
                <span className="chip !bg-clay-50 !text-clay-600 !text-xs">مستحق</span>
              )}
            </div>
            <div className="space-y-2">
              {doses.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className="card !p-3.5 w-full text-start flex items-center gap-3 active:scale-[0.99] transition"
                >
                  <span
                    className={cx(
                      'w-10 h-10 rounded-full grid place-items-center shrink-0',
                      v.givenAt ? 'bg-ink-400 text-white' : 'bg-paper-200 text-ink-400',
                    )}
                  >
                    {v.givenAt ? <CheckIcon className="w-5 h-5" /> : <SyringeIcon className="w-5 h-5" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-ink-900 leading-snug">{v.name}</span>
                    <span className="block text-xs text-ink-400">
                      {v.givenAt ? `أُعطي في ${formatShortDate(v.givenAt)}` : 'لم يُعطَ بعد'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {/* تفاصيل الجرعة */}
      <VaccineSheet
        dose={current}
        onClose={() => setSelected(null)}
        onDelete={(v) =>
          confirm({
            title: 'حذف هذه الجرعة من الجدول؟',
            confirmLabel: 'حذف',
            onConfirm: () => {
              void deleteVaccine(v.id)
              setSelected(null)
            },
          })
        }
      />

      <AddVaccineSheet open={addOpen} onClose={() => setAddOpen(false)} />
      {dialog}
    </>
  )
}

function VaccineSheet({
  dose,
  onClose,
  onDelete,
}: {
  dose: VaccineDose | null
  onClose: () => void
  onDelete: (v: VaccineDose) => void
}) {
  const [date, setDate] = useState('')
  const [loadedId, setLoadedId] = useState<string | undefined>()

  if (dose && dose.id !== loadedId) {
    setLoadedId(dose.id)
    setDate(dose.givenAt ? dose.givenAt.slice(0, 10) : localDateInputValue())
  }

  return (
    <Sheet open={!!dose} onClose={onClose} title={dose?.name ?? ''}>
      {dose && (
        <>
          <p className="text-sm text-ink-500 mb-4">الموعد المقرّر: {groupLabel(dose.dueMonths)}</p>

          <Field label="تاريخ الإعطاء">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <Button
            className="w-full mb-2"
            onClick={() => {
              void setVaccineGiven(dose.id, date ? localDateToIso(date) : null)
              onClose()
            }}
          >
            تسجيل كمُعطى
          </Button>

          {dose.givenAt && (
            <Button
              variant="ghost"
              className="w-full mb-2"
              onClick={() => {
                void setVaccineGiven(dose.id, null)
                onClose()
              }}
            >
              تراجع — لم يُعطَ بعد
            </Button>
          )}

          {!dose.builtIn && (
            <Button variant="ghost" className="w-full !text-red-700" onClick={() => onDelete(dose)}>
              <TrashIcon className="w-5 h-5" /> حذف من الجدول
            </Button>
          )}
        </>
      )}
    </Sheet>
  )
}

function AddVaccineSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [months, setMonths] = useState('')

  function submit() {
    if (!name.trim()) return
    void addVaccine(name.trim(), months ? Number(months) : 0)
    setName('')
    setMonths('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="إضافة تطعيم">
      <Field label="اسم التطعيم">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: الإنفلونزا الموسمية" />
      </Field>
      <Field label="العمر المستحق (بالأشهر)">
        <input
          type="number"
          inputMode="numeric"
          className="input"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          placeholder="6"
        />
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!name.trim()}>
        إضافة للجدول
      </Button>
    </Sheet>
  )
}
