import { Card } from '../../components/ui'
import { HIDEABLE_TOOLS, setToolHidden, useHiddenTools, type HideableTool } from '../../lib/trackPrefs'

/** تخصيص أدوات المتابعة المعروضة على هذا الجهاز — إخفاء عرض فقط، لا يمسّ أي سجل */
export default function TrackPrefsCard() {
  const hidden = useHiddenTools()
  return (
    <>
      <div className="eyebrow mb-2.5 mt-7">تخصيص المتابعة</div>
      <Card>
        <p className="text-xs text-ink-400 leading-relaxed mb-3">
          اختاروا الأدوات التي تظهر على هذا الجهاز. الإخفاء لا يحذف شيئًا، وكل
          سجلاتها محفوظة ويمكن إعادتها في أي وقت. الأدوية والمواعيد والتطعيمات
          والرعاية اليومية تظهر دائمًا.
        </p>
        {(Object.keys(HIDEABLE_TOOLS) as HideableTool[]).map((tool) => (
          <label key={tool} className="flex items-center justify-between min-h-[44px] text-ink-800">
            <span>{HIDEABLE_TOOLS[tool]}</span>
            <input
              type="checkbox"
              className="w-5 h-5 accent-current"
              checked={!hidden.includes(tool)}
              onChange={(e) => setToolHidden(tool, !e.target.checked)}
            />
          </label>
        ))}
      </Card>
    </>
  )
}
