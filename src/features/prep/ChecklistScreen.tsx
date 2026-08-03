import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, Field, ProgressBar, Sheet, cx } from '../../components/ui'
import { CheckIcon, PlusIcon, TrashIcon } from '../../components/icons'
import {
  addChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  useAppData,
} from '../../data/dataService'
import type { ChecklistName } from '../../data/types'

const META: Record<ChecklistName, { title: string; subtitle: string }> = {
  hospital: { title: 'شنطة المستشفى', subtitle: 'جهّزوها قبل الموعد' },
  shopping: { title: 'مشتريات المولود', subtitle: 'كل ما يحتاجه صغيركم' },
}

export default function ChecklistScreen({ list }: { list: ChecklistName }) {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const items = data.checklist.filter((c) => c.list === list)
  const done = items.filter((c) => c.done).length

  // تجميع حسب الفئة
  const categories = new Map<string, typeof items>()
  for (const it of items) {
    if (!categories.has(it.category)) categories.set(it.category, [])
    categories.get(it.category)!.push(it)
  }

  return (
    <>
      <ScreenHeader
        title={META[list].title}
        subtitle={META[list].subtitle}
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-sage-400 text-white shadow-soft"
            aria-label="عنصر جديد"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sage-800">الإنجاز</span>
          <span className="text-sage-500">
            {done} / {items.length}
          </span>
        </div>
        <ProgressBar value={items.length ? done / items.length : 0} />
      </Card>

      {[...categories.entries()].map(([cat, list]) => (
        <div key={cat} className="mb-5">
          <div className="text-sm font-bold text-sage-500 mb-2 px-1">{cat}</div>
          <div className="space-y-2">
            {list.map((it) => (
              <button
                key={it.id}
                onClick={() => toggleChecklistItem(it.id)}
                className="card !p-3 w-full flex items-center gap-3 text-start active:scale-[0.99] transition"
              >
                <span
                  className={cx(
                    'w-7 h-7 rounded-full grid place-items-center shrink-0 border-2 transition',
                    it.done ? 'bg-sage-400 border-sage-400 text-white' : 'border-cream-300 text-transparent',
                  )}
                >
                  <CheckIcon className="w-4 h-4" />
                </span>
                <span className={cx('flex-1', it.done && 'line-through text-sage-300')}>{it.label}</span>
                {!it.builtIn && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteChecklistItem(it.id)
                    }}
                    className="text-sage-300 hover:text-peach-500 p-1"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      <AddItemSheet open={open} onClose={() => setOpen(false)} list={list} categories={[...categories.keys()]} />
    </>
  )
}

function AddItemSheet({
  open,
  onClose,
  list,
  categories,
}: {
  open: boolean
  onClose: () => void
  list: ChecklistName
  categories: string[]
}) {
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState(categories[0] ?? 'أخرى')

  function submit() {
    if (!label.trim()) return
    void addChecklistItem({ label: label.trim(), category: category.trim() || 'أخرى', list })
    setLabel('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="عنصر جديد">
      <Field label="العنصر">
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="اكتب العنصر" />
      </Field>
      <Field label="الفئة">
        <input
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="اسم الفئة"
          list="cat-suggestions"
        />
        <datalist id="cat-suggestions">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!label.trim()}>
        إضافة
      </Button>
    </Sheet>
  )
}
