import { useAppSelector, useDataStatus } from './dataService'
import { useFamilySyncState, type FamilySyncState } from './familySync'

/**
 * حالة حفظ سجل واحد ومزامنته، مشتقّة من بيانات موجودة أصلًا — بلا حقول جديدة
 * في البيانات المحفوظة.
 *
 * - `device`  : محفوظ على هذا الجهاز (المزامنة غير مفعّلة، أو سجل وسائط محلي دائمًا)
 * - `pending` : محفوظ محليًا وينتظر وصوله للسحابة
 * - `synced`  : ثبت في سحابة العائلة. **لا يعني أن الجهاز الآخر استلمه.**
 * - `failed`  : تعذّر الحفظ على الجهاز، أو تعذّرت المزامنة ولم يثبت السجل بعد
 */
export type RecordSyncStatus = 'device' | 'pending' | 'synced' | 'failed'

export interface RecordSyncInput {
  /** الوسائط (صور/تسجيلات) محلية بعقدها الحالي ولا تصعد إلى السحابة */
  mediaOnly: boolean
  /** ختم آخر تعديل محلي للسجل (`syncMeta.rev[id]`)، أو undefined لسجل لم يُعدَّل بعد */
  localRev: string | undefined
  sync: Pick<FamilySyncState, 'status' | 'code' | 'hydrated' | 'cloudRev'>
  /** فشلت آخر كتابة على هذا الجهاز */
  localSaveFailed: boolean
}

export function resolveRecordSyncStatus(input: RecordSyncInput, id: string): RecordSyncStatus {
  const { mediaOnly, localRev, sync, localSaveFailed } = input
  if (localSaveFailed) return 'failed'
  if (mediaOnly || !sync.code || sync.status === 'idle') return 'device'

  // سجل بلا ختم لم يُعدَّل منذ أول لقطة، فالمطلوب أن يكون في السحابة
  // بأي ختم. أما السجل المختوم فلا يُقرّ به إلا ختم سحابي لا يقلّ عنه:
  // إقرار نسخة قديمة لا يغطي تعديلًا أحدث.
  const cloud = sync.cloudRev[id]
  const acknowledged = localRev === undefined ? sync.hydrated : cloud !== undefined && cloud >= localRev
  if (acknowledged) return 'synced'
  return sync.status === 'error' ? 'failed' : 'pending'
}

export function useRecordSyncStatus(id: string, mediaOnly = false): RecordSyncStatus {
  const localRev = useAppSelector((d) => d.syncMeta.rev[id])
  const sync = useFamilySyncState()
  const { error } = useDataStatus()
  return resolveRecordSyncStatus({ mediaOnly, localRev, sync, localSaveFailed: error !== null }, id)
}

export const RECORD_SYNC_LABEL: Record<RecordSyncStatus, string> = {
  device: 'محفوظ على هذا الجهاز',
  pending: 'بانتظار المزامنة',
  synced: 'تزامن مع العائلة',
  failed: 'تعذّر الحفظ أو المزامنة',
}
