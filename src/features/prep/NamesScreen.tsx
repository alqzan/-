import { useState } from 'react'
import { ScreenHeader } from '../../components/Header'
import { Button, Card, EmptyState, Field, Segmented, Sheet, cx } from '../../components/ui'
import { HeartFillIcon, HeartIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { addName, deleteName, toggleNameVote, useAppData } from '../../data/dataService'
import type { Gender, NameIdea, Parent } from '../../data/types'
import { parentLabel } from '../../lib/format'

const genderLabel: Record<Gender, string> = { boy: 'ولد', girl: 'بنت', unknown: 'محايد' }
const totalVotes = (n: NameIdea) => (n.votes.mom ? 1 : 0) + (n.votes.dad ? 1 : 0)

export default function NamesScreen() {
  const data = useAppData()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | Gender>('all')

  const filtered = data.names.filter((n) => filter === 'all' || n.gender === filter)
  const sorted = [...filtered].sort((a, b) => totalVotes(b) - totalVotes(a))

  return (
    <>
      <ScreenHeader
        title="قائمة الأسماء"
        subtitle="صوّتوا لأسمائكم المفضلة"
        back
        action={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-full bg-blush-300 text-white shadow-soft"
            aria-label="اسم جديد"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <div className="mb-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'الكل' },
            { value: 'boy', label: 'ولد' },
            { value: 'girl', label: 'بنت' },
            { value: 'unknown', label: 'محايد' },
          ]}
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<HeartIcon className="w-8 h-8" />}
          title="لا أسماء بعد"
          hint="اقترحوا أسماء وصوّتوا عليها معًا."
          action={<Button onClick={() => setOpen(true)}>أضف اسمًا</Button>}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((n, i) => (
            <Card key={n.id} className="!p-3.5">
              <div className="flex items-center gap-3">
                {i === 0 && totalVotes(n) === 2 && <span className="text-xl">👑</span>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-sage-800">{n.name}</span>
                    <span
                      className={cx(
                        'chip !text-xs',
                        n.gender === 'boy' ? '!bg-sky-100 !text-sky-300' : n.gender === 'girl' ? '!bg-blush-100 !text-blush-300' : '',
                      )}
                    >
                      {genderLabel[n.gender]}
                    </span>
                  </div>
                  {n.meaning && <div className="text-sm text-sage-400 mt-0.5">{n.meaning}</div>}
                  <div className="text-[11px] text-sage-300 mt-0.5">اقترحه {parentLabel(n.proposedBy)}</div>
                </div>

                {/* أزرار التصويت */}
                <div className="flex items-center gap-1">
                  {(['mom', 'dad'] as Parent[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => toggleNameVote(n.id, p)}
                      className={cx(
                        'flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition',
                        n.votes[p] ? 'text-peach-500' : 'text-sage-300',
                      )}
                      title={parentLabel(p)}
                    >
                      {n.votes[p] ? <HeartFillIcon className="w-6 h-6" /> : <HeartIcon className="w-6 h-6" />}
                      <span className="text-[10px]">{parentLabel(p)}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => deleteName(n.id)}
                    className="text-sage-300 hover:text-peach-500 p-1"
                    aria-label="حذف"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddNameSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function AddNameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [meaning, setMeaning] = useState('')
  const [gender, setGender] = useState<Gender>('boy')
  const [proposedBy, setProposedBy] = useState<Parent>('mom')

  function submit() {
    if (!name.trim()) return
    addName({ name: name.trim(), meaning: meaning.trim() || undefined, gender, proposedBy })
    setName('')
    setMeaning('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="اسم جديد">
      <Field label="الاسم">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب الاسم" />
      </Field>
      <Field label="المعنى (اختياري)">
        <input className="input" value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="معنى الاسم" />
      </Field>
      <Field label="النوع">
        <Segmented
          value={gender}
          onChange={setGender}
          options={[
            { value: 'boy', label: 'ولد' },
            { value: 'girl', label: 'بنت' },
            { value: 'unknown', label: 'محايد' },
          ]}
        />
      </Field>
      <Field label="المقترِح">
        <Segmented
          value={proposedBy}
          onChange={setProposedBy}
          options={[
            { value: 'mom', label: 'أمي' },
            { value: 'dad', label: 'أبي' },
          ]}
        />
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!name.trim()}>
        إضافة الاسم
      </Button>
    </Sheet>
  )
}
