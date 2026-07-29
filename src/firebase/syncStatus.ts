// ============================================================
// حالة مزامنة صغيرة تُعرض في الواجهة (نص/شارة صغيرة، على نمط
// النصوص التوضيحية الصغيرة الموجودة أصلًا في شاشات التطبيق).
// ============================================================

import { useSyncExternalStore } from 'react'

export type SyncState = 'saved' | 'syncing' | 'offline' | 'error' | 'disabled'

export interface SyncStatus {
  state: SyncState
  message: string | null
}

let status: SyncStatus = { state: 'disabled', message: null }
const listeners = new Set<() => void>()

export function setSyncStatus(next: SyncStatus) {
  status = next
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => status,
  )
}

/** نص عربي قصير مناسب لعرضه بجانب أي شاشة (يشبه نصوص VaccinesScreen التوضيحية) */
export function syncStatusLabel(s: SyncStatus): string {
  switch (s.state) {
    case 'saved':
      return 'تمت المزامنة ✓'
    case 'syncing':
      return 'جارٍ الحفظ في السحابة…'
    case 'offline':
      return 'غير متصل — سيُزامَن عند عودة الإنترنت'
    case 'error':
      return s.message ?? 'تعذّرت المزامنة'
    case 'disabled':
      return ''
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (status.state === 'offline') setSyncStatus({ state: 'saved', message: null })
  })
  window.addEventListener('offline', () => {
    setSyncStatus({ state: 'offline', message: null })
  })
}
