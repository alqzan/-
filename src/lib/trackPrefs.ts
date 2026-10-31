import { useSyncExternalStore } from 'react'

/**
 * تفضيلات عرض شاشة المتابعة — **خاصة بهذا الجهاز** ومنفصلة تمامًا عن البيانات.
 *
 * الإخفاء عرضٌ فقط: لا يحذف سجلًّا ولا يمسّ مصفوفة أداة ولا مسارها، ولا يصعد
 * إلى المزامنة، فتخصيص أحد الوالدين لا يغيّر شاشة الآخر. مفتاحها جديد
 * ولا يلمس مفاتيح بيانات الأسرة.
 */
export const TRACK_PREFS_KEY = 'tafalna:track-prefs:v1'

/** الأدوات الاختيارية وحدها قابلة للإخفاء؛ الصحة والرعاية اليومية تبقى دائمًا */
export const HIDEABLE_TOOLS = {
  development: 'تطوّر الجنين',
  contractions: 'الانقباضات',
  kicks: 'الركلات',
  names: 'الأسماء',
  hospital: 'شنطة المستشفى',
  shopping: 'مشتريات المولود',
} as const

export type HideableTool = keyof typeof HIDEABLE_TOOLS

const isHideable = (v: unknown): v is HideableTool =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(HIDEABLE_TOOLS, v)

export function parseHidden(raw: string | null): HideableTool[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { hidden?: unknown }
    return Array.isArray(parsed.hidden) ? [...new Set(parsed.hidden.filter(isHideable))] : []
  } catch {
    return []
  }
}

let hidden: HideableTool[] = []
let loaded = false
const listeners = new Set<() => void>()

function load(): HideableTool[] {
  if (!loaded) {
    loaded = true
    try {
      hidden = parseHidden(localStorage.getItem(TRACK_PREFS_KEY))
    } catch {
      hidden = []
    }
  }
  return hidden
}

export function setToolHidden(tool: HideableTool, value: boolean): void {
  const current = load()
  if (current.includes(tool) === value) return
  hidden = value ? [...current, tool] : current.filter((t) => t !== tool)
  try {
    localStorage.setItem(TRACK_PREFS_KEY, JSON.stringify({ hidden }))
  } catch {
    // تعذّر الحفظ: يبقى التفضيل في هذه الجلسة فقط ولا يؤثر على أي بيانات
  }
  listeners.forEach((l) => l())
}

export function useHiddenTools(): readonly HideableTool[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    load,
    load,
  )
}

/** للاختبارات فقط */
export function resetTrackPrefsForTests(): void {
  loaded = false
  hidden = []
}
