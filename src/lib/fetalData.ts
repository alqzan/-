// بيانات تطوّر الجنين أسبوعيًا (تقريبية للاطّلاع العام — ليست نصيحة طبية)
// المقاسات من بداية الأسبوع تقريبًا. مقارنة الحجم بشيء مألوف.

export interface FetalWeek {
  week: number
  fruit: string
  emoji: string
  lengthCm: number
  weightG: number
  note: string
}

export const FETAL_WEEKS: FetalWeek[] = [
  { week: 4, fruit: 'بذرة خشخاش', emoji: '•', lengthCm: 0.1, weightG: 0, note: 'بدأت الرحلة! تنغرس البويضة الملقّحة وتتشكّل الأكياس الأولى.' },
  { week: 5, fruit: 'بذرة سمسم', emoji: '⚬', lengthCm: 0.2, weightG: 0, note: 'يبدأ القلب البدائي والأنبوب العصبي بالتشكّل.' },
  { week: 6, fruit: 'حبة عدس', emoji: '🫘', lengthCm: 0.5, weightG: 0, note: 'قد يُسمع نبض القلب الصغير في هذا الأسبوع.' },
  { week: 7, fruit: 'حبة توت', emoji: '🫐', lengthCm: 1, weightG: 1, note: 'تظهر براعم الأطراف وتتضاعف خلايا الدماغ بسرعة.' },
  { week: 8, fruit: 'حبة فاصوليا', emoji: '🫘', lengthCm: 1.6, weightG: 1, note: 'تبدأ الأصابع بالظهور وتتحرك الأطراف الصغيرة.' },
  { week: 9, fruit: 'حبة عنب', emoji: '🍇', lengthCm: 2.3, weightG: 2, note: 'تتشكّل ملامح الوجه الأساسية والمفاصل.' },
  { week: 10, fruit: 'حبة فراولة', emoji: '🍓', lengthCm: 3.1, weightG: 4, note: 'اكتملت الأعضاء الحيوية وبدأت تعمل. صار جنينًا!' },
  { week: 11, fruit: 'حبة تين', emoji: '🫒', lengthCm: 4.1, weightG: 7, note: 'يفتح ويغلق قبضته الصغيرة، وتظهر أظافر الأصابع.' },
  { week: 12, fruit: 'حبة ليمون', emoji: '🍋', lengthCm: 5.4, weightG: 14, note: 'يستطيع التثاؤب، وتعمل الكلى فينتج القليل من البول.' },
  { week: 13, fruit: 'حبة خوخ', emoji: '🍑', lengthCm: 7.4, weightG: 23, note: 'نهاية الثلث الأول! تظهر البصمات الفريدة على الأصابع.' },
  { week: 14, fruit: 'حبة ليمون كبيرة', emoji: '🍋', lengthCm: 8.7, weightG: 43, note: 'يبدأ بتعابير الوجه، وقد يمصّ إبهامه.' },
  { week: 15, fruit: 'حبة تفاح', emoji: '🍎', lengthCm: 10.1, weightG: 70, note: 'يستطيع الإحساس بالضوء رغم إغلاق عينيه.' },
  { week: 16, fruit: 'حبة أفوكادو', emoji: '🥑', lengthCm: 11.6, weightG: 100, note: 'يتحرك بنشاط، وقد تشعر الأم قريبًا بأولى الركلات.' },
  { week: 17, fruit: 'حبة كمثرى', emoji: '🍐', lengthCm: 13, weightG: 140, note: 'تتشكّل طبقة دهنية تحت الجلد وتقوى العظام.' },
  { week: 18, fruit: 'حبة فلفل حلو', emoji: '🫑', lengthCm: 14.2, weightG: 190, note: 'بدأ السمع يعمل، فقد يسمع صوت قلب أمه!' },
  { week: 19, fruit: 'حبة طماطم', emoji: '🍅', lengthCm: 15.3, weightG: 240, note: 'تتشكّل طبقة حامية على الجلد (الطلاء الجبني).' },
  { week: 20, fruit: 'حبة موز', emoji: '🍌', lengthCm: 25.6, weightG: 300, note: 'منتصف الطريق! غالبًا يُعرف نوع الجنين في هذه الفترة.' },
  { week: 21, fruit: 'حبة جزر', emoji: '🥕', lengthCm: 26.7, weightG: 360, note: 'يبتلع السائل ويتذوّق نكهات ما تأكله الأم.' },
  { week: 22, fruit: 'حبة كوسا', emoji: '🥒', lengthCm: 27.8, weightG: 430, note: 'تتضح ملامحه: حاجبان ورموش وشعر ناعم.' },
  { week: 23, fruit: 'حبة مانجو', emoji: '🥭', lengthCm: 28.9, weightG: 500, note: 'يستجيب للأصوات ويتحرك عند سماع صوت مرتفع.' },
  { week: 24, fruit: 'كوز ذرة', emoji: '🌽', lengthCm: 30, weightG: 600, note: 'تكتمل الرئتان أكثر استعدادًا للتنفّس مستقبلًا.' },
  { week: 25, fruit: 'حبة لفت', emoji: '🥔', lengthCm: 34.6, weightG: 660, note: 'يزداد وزنه وتظهر تجاعيد الجلد بالامتلاء تدريجيًا.' },
  { week: 26, fruit: 'رأس خس', emoji: '🥬', lengthCm: 35.6, weightG: 760, note: 'يفتح عينيه لأول مرة ويرمش.' },
  { week: 27, fruit: 'حبة قرنبيط', emoji: '🥦', lengthCm: 36.6, weightG: 875, note: 'نهاية الثلث الثاني! ينام ويستيقظ بمواعيد منتظمة.' },
  { week: 28, fruit: 'حبة باذنجان', emoji: '🍆', lengthCm: 37.6, weightG: 1000, note: 'يحلم (حركة عين سريعة) وتتطوّر شبكية العين.' },
  { week: 29, fruit: 'حبة قرع صغير', emoji: '🎃', lengthCm: 38.6, weightG: 1150, note: 'تقوى عضلاته ورئتاه، وركلاته صارت أوضح.' },
  { week: 30, fruit: 'رأس ملفوف', emoji: '🥬', lengthCm: 39.9, weightG: 1300, note: 'ينمو الشعر على رأسه، ويتحكّم أفضل بحرارة جسمه.' },
  { week: 31, fruit: 'حبة جوز هند', emoji: '🥥', lengthCm: 41.1, weightG: 1500, note: 'يعالج المعلومات ويتلقّى إشارات بكل حواسه.' },
  { week: 32, fruit: 'حبة كرنب', emoji: '🥬', lengthCm: 42.4, weightG: 1700, note: 'غالبًا يستقرّ رأسه للأسفل استعدادًا للولادة.' },
  { week: 33, fruit: 'حبة أناناس', emoji: '🍍', lengthCm: 43.7, weightG: 1900, note: 'تلتحم عظام جمجمته بمرونة لتسهيل الولادة.' },
  { week: 34, fruit: 'شمّام صغير', emoji: '🍈', lengthCm: 45, weightG: 2150, note: 'يكتمل الجهاز العصبي المركزي والرئتان أكثر.' },
  { week: 35, fruit: 'شمّام', emoji: '🍈', lengthCm: 46.2, weightG: 2400, note: 'صار الرحم أضيق عليه، لكن يزداد وزنًا كل يوم.' },
  { week: 36, fruit: 'رأس خس روماني', emoji: '🥬', lengthCm: 47.4, weightG: 2600, note: 'يكتسب حوالي 30 جرامًا يوميًا. قريب من التمام!' },
  { week: 37, fruit: 'ساق كرفس', emoji: '🥬', lengthCm: 48.6, weightG: 2900, note: 'يُعدّ مكتمل النمو مبكرًا. يتدرّب على المصّ والتنفّس.' },
  { week: 38, fruit: 'حبة يقطين', emoji: '🎃', lengthCm: 49.8, weightG: 3080, note: 'تتشكّل قبضته بقوة، وتكتمل أعضاؤه.' },
  { week: 39, fruit: 'حبة بطيخ صغير', emoji: '🍉', lengthCm: 50.7, weightG: 3290, note: 'جاهز للقاء! تكتمل الرئتان تمامًا.' },
  { week: 40, fruit: 'حبة يقطين كبيرة', emoji: '🎃', lengthCm: 51.2, weightG: 3460, note: 'موعد اللقاء! كل شيء جاهز لاستقبال العالم. ✨' },
]

/** يرجع أقرب بيانات أسبوع للأسبوع المطلوب */
export function getFetalWeek(week: number): FetalWeek {
  const clamped = Math.max(4, Math.min(40, week))
  let best = FETAL_WEEKS[0]
  for (const w of FETAL_WEEKS) {
    if (w.week <= clamped) best = w
    else break
  }
  return best
}
