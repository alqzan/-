import { useEffect, useRef } from 'react'
import { syncableSnapshot, useAppData } from './dataService'
import { pushToCloud, useFamilySyncState } from './familySync'

/** يدمج كتابات متتالية سريعة (كل ضغطة حرف) في دفعة واحدة إلى الشبكة */
const PUSH_DEBOUNCE_MS = 800

/**
 * مكوّن صامت بلا واجهة — يعيش مرة واحدة في جذر التطبيق.
 *
 * يراقب البيانات المحلية، وإن كانت المزامنة متّصلة يدفع الحقول
 * القابلة للمزامنة فقط (بلا صور ولا تسجيلات صوتية) إلى العائلة
 * السحابية بعد تأخير بسيط. لا يقرأ من الشبكة — ذلك عمل `familySync.ts`.
 */
export default function FamilySyncBridge() {
  const data = useAppData()
  const sync = useFamilySyncState()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (sync.status !== 'connected' || !sync.code) return
    const code = sync.code
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void pushToCloud(code, syncableSnapshot(code))
    }, PUSH_DEBOUNCE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // البيانات كاملة (`data`) هي محفّز إعادة الدفع عمدًا — أي تعديل نصّي
    // في أي مجموعة يجب أن يصل للطرف الآخر، لا حقول بعينها.
  }, [data, sync.status, sync.code])

  return null
}
