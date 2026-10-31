// =============================================================
// اقتراحات محطات حسب العمر (٠–٣٦ شهرًا).
//
// قائمة ثابتة للعرض فقط: لا تُضاف إلى بيانات أحد إلا إذا ضغط الوالدان على
// اقتراح بعينه. فلا ترحيل لبيانات قائمة ولا محطات تظهر بنفسها.
// `from`/`to` نافذة العمر بالأشهر التي يُعرض فيها الاقتراح.
// =============================================================

export interface MilestoneSuggestion {
  title: string
  from: number
  to: number
}

export const MILESTONE_SUGGESTIONS: MilestoneSuggestion[] = [
  { title: 'أول مرة يمسك لعبة بيده', from: 2, to: 7 },
  { title: 'أول مرة يأكل أكل غير الحليب', from: 5, to: 9 },
  { title: 'أول مرة يقول «ماما» أو «بابا»', from: 6, to: 12 },
  { title: 'أول مرة يصفّق', from: 7, to: 12 },
  { title: 'أول مرة يشرب من كوب', from: 8, to: 14 },
  { title: 'أول عيد ميلاد', from: 11, to: 14 },
  { title: 'يمشي بلا مساعدة', from: 11, to: 18 },
  { title: 'أول قصة الشعر', from: 10, to: 24 },
  { title: 'أول سفرة', from: 6, to: 24 },
  { title: 'يشير لما يريد', from: 9, to: 15 },
  { title: 'أول جملة من كلمتين', from: 16, to: 28 },
  { title: 'يركض ويقفز', from: 16, to: 28 },
  { title: 'يأكل بالملعقة لحاله', from: 14, to: 26 },
  { title: 'يرسم أول خربشة', from: 14, to: 26 },
  { title: 'يعرف اسمه ويقوله', from: 18, to: 30 },
  { title: 'يصعد الدرج', from: 18, to: 30 },
  { title: 'أول ليلة بلا حفاض', from: 24, to: 40 },
  { title: 'يبدأ تدريب الحمّام', from: 20, to: 36 },
  { title: 'يعدّ إلى عشرة', from: 28, to: 42 },
  { title: 'يغنّي أغنية كاملة', from: 24, to: 40 },
  { title: 'يلبس ملابسه بنفسه', from: 28, to: 42 },
  { title: 'أول يوم حضانة', from: 20, to: 42 },
  { title: 'يحكي لك قصة قصيرة', from: 30, to: 48 },
]

/** اقتراحات تناسب العمر الحالي ولم تُسجَّل بعد (مقارنة بالعنوان) */
export function suggestionsForAge(
  ageMonths: number,
  existingTitles: string[],
  limit = 5,
): MilestoneSuggestion[] {
  const have = new Set(existingTitles.map((t) => t.trim()))
  return MILESTONE_SUGGESTIONS.filter(
    (s) => ageMonths >= s.from && ageMonths <= s.to && !have.has(s.title),
  ).slice(0, limit)
}
