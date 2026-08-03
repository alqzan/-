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

/**
 * يُرجع دالة `confirm` لطلب التأكيد، و`dialog` تُوضع في شجرة الشاشة.
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
    <Sheet open={!!request} onClose={close} title={request?.title ?? ''}>
      {request && (
        <>
          {request.message && (
            <p className="text-sage-600 leading-relaxed mb-5">{request.message}</p>
          )}
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 py-3" onClick={close}>
              تراجع
            </Button>
            <button
              className={
                'btn flex-1 py-3 text-white shadow-soft ' +
                (request.destructive !== false
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-sage-400 hover:bg-sage-500')
              }
              onClick={() => {
                request.onConfirm()
                close()
              }}
            >
              {request.confirmLabel ?? 'تأكيد'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )

  return { confirm, dialog }
}
