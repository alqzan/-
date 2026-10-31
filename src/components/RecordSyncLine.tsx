import { RECORD_SYNC_LABEL, useRecordSyncStatus } from '../data/recordSyncStatus'

/**
 * سطر صغير يوضّح مصير سجل واحد: على الجهاز فقط، ينتظر المزامنة، ثبت في سحابة
 * العائلة، أو تعذّر. بلا شارات ولا ألوان صاخبة كي لا يزاحم الدفتر.
 */
export default function RecordSyncLine({ id, mediaOnly = false }: { id: string; mediaOnly?: boolean }) {
  const status = useRecordSyncStatus(id, mediaOnly)
  return (
    <p
      role="status"
      data-sync-status={status}
      className={`text-xs mb-3 ${status === 'failed' ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}
    >
      {RECORD_SYNC_LABEL[status]}
    </p>
  )
}
