import type { AppData } from './types'

/** رقم إصدار البيانات المخزّنة — يُستخدم للترقية عند تحديث التطبيق */
export const DATA_VERSION = 3

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    setupComplete: false,
    child: {
      name: '',
      gender: 'unknown',
      lmpDate: null,
      dueDate: null,
      bornAt: null,
      photo: null,
      parents: { momName: '', dadName: '' },
    },
    kicks: [],
    contractions: [],
    appointments: [],
    momLogs: [],
    photos: [],
    journal: [],
    capsules: [],
    milestones: builtInMilestones(),
    names: [],
    checklist: [...hospitalBag(), ...shoppingList()],
    feedings: [],
    diapers: [],
    sleep: [],
    growth: [],
    vaccines: builtInVaccines(),
  }
}

// بيانات تجريبية أولية (عربية) — للعرض والتجربة فقط.
// لا تُستخدم عند أول تشغيل حقيقي (الأول يبدأ بـ emptyData).

export function seedData(): AppData {
  return {
    version: DATA_VERSION,
    setupComplete: true,
    child: {
      name: 'طفلنا',
      gender: 'unknown',
      lmpDate: '2026-02-14',
      dueDate: '2026-11-21',
      bornAt: null,
      photo: null,
      parents: { momName: 'أمي', dadName: 'أبي' },
    },

    kicks: [
      {
        id: 'k1',
        startedAt: '2026-07-17T21:10:00',
        endedAt: '2026-07-17T21:38:00',
        count: 10,
      },
    ],

    contractions: [],

    appointments: [
      {
        id: 'a1',
        title: 'سونار الأسبوع 24',
        dateTime: '2026-07-28T10:30:00',
        type: 'ultrasound',
        location: 'مستشفى الولادة والأطفال',
        notes: 'إحضار تقرير الفحص السابق.',
      },
      {
        id: 'a2',
        title: 'متابعة دورية',
        dateTime: '2026-08-15T12:00:00',
        type: 'checkup',
        location: 'عيادة د. سارة',
      },
    ],

    momLogs: [
      {
        id: 'm1',
        date: '2026-07-16',
        weightKg: 64.5,
        mood: 'good',
        symptoms: ['غثيان خفيف'],
        note: 'يوم هادئ ولله الحمد.',
      },
    ],

    photos: [],

    journal: [
      {
        id: 'j1',
        title: 'أول ركلة حسّيت فيها',
        text: 'اليوم حسّيت بأول ركلة واضحة! لحظة ما بنساها أبدًا. كأنك تسلّم علينا من هناك 💛',
        date: '2026-07-10',
        author: 'mom',
      },
      {
        id: 'j2',
        title: 'رسالة من أبوك',
        text: 'ننتظرك بفارغ الصبر يا صغيرنا. جهّزنا لك كل شيء بحب، وباقي إنت بس.',
        date: '2026-07-12',
        author: 'dad',
      },
    ],

    capsules: [
      {
        id: 'c1',
        title: 'تُفتح في عيد ميلادك الأول',
        message: 'حبيبنا، يوم ما تقرأ هذي الرسالة تكون كملت سنة! كنت أحلى هدية وصلتنا. نحبك 🎂',
        author: 'mom',
        openAt: '2027-11-21',
        createdAt: '2026-07-12',
        isOpened: false,
      },
    ],

    milestones: builtInMilestones(),

    names: [
      { id: 'n1', name: 'يوسف', gender: 'boy', meaning: 'يزيد ويضاعف الخير', proposedBy: 'dad', votes: { mom: true, dad: true } },
      { id: 'n2', name: 'لين', gender: 'girl', meaning: 'النعومة والرقة', proposedBy: 'mom', votes: { mom: true, dad: false } },
      { id: 'n3', name: 'آدم', gender: 'boy', meaning: 'أبو البشر', proposedBy: 'mom', votes: { mom: false, dad: true } },
      { id: 'n4', name: 'سما', gender: 'girl', meaning: 'العلوّ والرفعة', proposedBy: 'dad', votes: { mom: true, dad: false } },
    ],

    checklist: [...hospitalBag(), ...shoppingList()],

    // رعاية المولود — فارغة حتى الولادة
    feedings: [],
    diapers: [],
    sleep: [],
    growth: [],
    vaccines: builtInVaccines(),
  }
}

/**
 * جدول تطعيمات استرشادي مبني على الجدول الوطني المعتاد في السعودية.
 * ليس بديلًا عن بطاقة التطعيم الرسمية — الشاشة تعرض تنبيهًا بذلك،
 * والوالدان يقدران على تعديل الجدول بالإضافة أو الحذف.
 */
export function builtInVaccines() {
  const schedule: Array<[string, number]> = [
    ['الدرن (BCG)', 0],
    ['التهاب الكبد B — الجرعة الأولى', 0],
    ['السداسي — الجرعة الأولى', 2],
    ['المكورات الرئوية — الجرعة الأولى', 2],
    ['الروتا — الجرعة الأولى', 2],
    ['شلل الأطفال الفموي — الجرعة الأولى', 2],
    ['السداسي — الجرعة الثانية', 4],
    ['المكورات الرئوية — الجرعة الثانية', 4],
    ['الروتا — الجرعة الثانية', 4],
    ['شلل الأطفال الفموي — الجرعة الثانية', 4],
    ['السداسي — الجرعة الثالثة', 6],
    ['المكورات الرئوية — الجرعة الثالثة', 6],
    ['الروتا — الجرعة الثالثة', 6],
    ['الحصبة', 9],
    ['المكورات السحائية — الجرعة الأولى', 9],
    ['الثلاثي الفيروسي (MMR) — الجرعة الأولى', 12],
    ['جدري الماء — الجرعة الأولى', 12],
    ['المكورات السحائية — الجرعة الثانية', 12],
    ['المكورات الرئوية — جرعة معزّزة', 12],
    ['الثلاثي الفيروسي (MMR) — الجرعة الثانية', 18],
    ['جدري الماء — الجرعة الثانية', 18],
    ['السداسي — جرعة معزّزة', 18],
    ['شلل الأطفال — جرعة معزّزة', 18],
    ['التهاب الكبد A — الجرعة الأولى', 18],
    ['التهاب الكبد A — الجرعة الثانية', 24],
    ['الثلاثي البكتيري + شلل الأطفال — معزّز ما قبل المدرسة', 48],
  ]
  return schedule.map(([name, dueMonths], i) => ({
    id: `vx${i + 1}`,
    name,
    dueMonths,
    givenAt: null,
    builtIn: true,
  }))
}

function builtInMilestones() {
  const items: Array<[string, string]> = [
    ['أول ابتسامة', '😊'],
    ['أول ضحكة', '😄'],
    ['رفع الرأس', '🙆'],
    ['التقلّب', '🔄'],
    ['أول سنّة', '🦷'],
    ['الجلوس', '🪑'],
    ['الحبو', '🐣'],
    ['أول كلمة', '🗣️'],
    ['الوقوف', '🧍'],
    ['أول خطوة', '👣'],
  ]
  return items.map(([title, emoji], i) => ({
    id: `ms${i + 1}`,
    title,
    emoji,
    achievedAt: null,
    builtIn: true,
  }))
}

function hospitalBag() {
  const groups: Record<string, string[]> = {
    'للأم': ['بطاقة الأحوال والملف الطبي', 'ملابس مريحة للخروج', 'مستلزمات نظافة شخصية', 'شبشب مريح', 'رباط شعر'],
    'للمولود': ['ملابس المولود (مقاسات مختلفة)', 'حفاضات حديثي الولادة', 'بطانية قطنية', 'قبعة وجوارب صغيرة', 'مناديل مبللة'],
    'أساسيات': ['شاحن الجوال', 'وجبات خفيفة', 'كاميرا لأول صورة'],
  }
  const out = []
  let i = 1
  for (const [category, labels] of Object.entries(groups)) {
    for (const label of labels) {
      out.push({ id: `hb${i++}`, label, category, list: 'hospital' as const, done: false, builtIn: true })
    }
  }
  return out
}

function shoppingList() {
  const groups: Record<string, string[]> = {
    'النوم': ['سرير المولود', 'مرتبة وملاءات', 'مراقب أطفال (مونيتور)'],
    'الملابس': ['أطقم داخلية (بودي)', 'أفيولات نوم', 'قبعات وجوارب'],
    'التغذية': ['رضّاعات', 'معقّم رضّاعات', 'مريلة إطعام'],
    'الحفاضات': ['حفاضات', 'مناديل مبللة', 'كريم للتسلّخات', 'طاولة تغيير'],
    'التنقّل': ['كرسي سيارة للمولود', 'عربة أطفال', 'حقيبة مستلزمات'],
  }
  const out = []
  let i = 1
  for (const [category, labels] of Object.entries(groups)) {
    for (const label of labels) {
      out.push({ id: `sp${i++}`, label, category, list: 'shopping' as const, done: false, builtIn: true })
    }
  }
  return out
}
