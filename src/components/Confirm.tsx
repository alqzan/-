import { useCallback, useState, type ReactNode } from 'react'
import { Button, Sheet } from './ui'

// نافذة تأكيد قبل أي إجراء لا رجعة فيه.
// السبب: كل ما يُحذف هنا ذكرى — لا نريد لمسة واحدة أن تمحوها.

type ConfirmRequest = {
  title: string
  message?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

/** نافذة تأكيد بحالة مُدارة من الشاشة */
export default function Confirm({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  destructive = true,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      {message && <p className="text-ink-600 leading-relaxed mb-6">{message}</p>}
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1 py-3" onClick={onCancel}>
          تراجع
        </Button>
        <button
          className={
            'btn flex-1 py-3 text-white ' +
            (destructive ? 'bg-clay-600 hover:bg-clay-700' : 'bg-ink-900 hover:bg-ink-800')
          }
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}

/**
 * نسخة الخطّاف لمن يحتاج تأكيدات متعدّدة في شاشة واحدة.
 *
 * ```tsx
 * const { confirm, dialog } = useConfirm()
 * <button onClick={() => confirm({ title: 'حذف؟', onConfirm: () => remove(id) })} />
 * {dialog}
 * ```
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  const confirm = useCallback((req: ConfirmRequest) => setRequest(req), [])
  const close = useCallback(() => setRequest(null), [])

  const dialog: ReactNode = (
    <Confirm
      open={!!request}
      title={request?.title ?? ''}
      message={request?.message}
      confirmLabel={request?.confirmLabel}
      destructive={request?.destructive !== false}
      onCancel={close}
      onConfirm={() => {
        request?.onConfirm()
        close()
      }}
    />
  )

  return { confirm, dialog }
}
