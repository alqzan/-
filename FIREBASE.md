# خطة ربط Firebase

> ✅ **مُنفَّذ اليوم**: مزامنة عائلية بين جهازين عبر Firestore — نصوص
> وسجلّات فقط، محلي أولًا (Local-first)، بلا صور ولا تسجيلات صوتية.
> راجع القسم التالي مباشرة. بقية هذا الملف خطّة أصلية أوسع (تبديل طبقة
> التخزين كلها بـ Firestore/Storage) ما زالت مرجعًا للخطوات المستقبلية
> غير المنفَّذة بعد.

---

## ٠. ما هو مُنفَّذ فعليًا الآن

**البنية: مزامنة موازية، لا استبدال لطبقة التخزين.** `LocalStorageAdapter`
يبقى كما هو تمامًا — كل قراءة وكتابة تمرّ به أولًا كما كانت. فوقه تعمل
طبقة مزامنة مستقلة (`src/data/familySync.ts`) تراقب البيانات المحلية
وتُزامن **الحقول النصية والسجلّات فقط** مع مستند عائلة واحد في Firestore،
بينما تبقى localStorage النسخة الأساسية والاحتياطية الدائمة على كل جهاز.

| القطعة | الملف | الدور |
|--------|-------|------|
| تسجيل الدخول المجهول + تهيئة Firebase | `src/lib/firebase.ts` | لا حسابات ولا كلمات مرور — `signInAnonymously` فقط |
| رمز الربط | `src/lib/familyCode.ts` | ٤٣ حرفًا عشوائيًا (`crypto.getRandomValues`) — هو معرّف المستند وسرّ الوصول إليه معًا |
| منطق الاتصال والدمج | `src/data/familySync.ts` | إنشاء/ربط/إيقاف، والاستماع لتحديثات Firestore |
| حدود ما يُزامَن | `src/data/dataService.ts` (`syncableSnapshot`, `mergeSyncedData`) | يستثني `photos` و`voices` وصورة كل موعد تمامًا |
| الدفع التلقائي عند أي تعديل محلي | `src/data/FamilySyncBridge.tsx` | مكوّن صامت في جذر التطبيق، بتأخير بسيط |
| الواجهة | `src/features/settings/FamilySyncCard.tsx` | بطاقة في الإعدادات: إنشاء، نسخ الرمز، ربط، إيقاف |
| قواعد الحماية | `firestore.rules` + `firebase.json` | `get` فقط لمن يعرف الرمز، `list` ممنوع تمامًا، لا صور/تسجيلات في أي كتابة |

**نموذج البيانات في Firestore:** مستند واحد لكل عائلة — `families/{code}`
— لا مجموعات فرعية. يحتوي كل الحقول النصية (`child`, `journal`,
`milestones`, `appointments` بلا صورها، إلخ) بلا `photos` ولا `voices`
إطلاقًا.

**القواعد الحاكمة المطبَّقة فعليًا:**
- لا يُنشأ مستند عائلة جديد عند إدخال رمز غير موجود — رسالة خطأ فقط.
- وصول التحديثات السحابية لا يمسّ `photos` أو `voices` أو صورة أي
  موعد محليًا — هذه الحقول غائبة عن حمولة المزامنة من الأساس.
- إيقاف المزامنة يفصل الجهاز فقط؛ لا يحذف شيئًا محليًا ولا سحابيًا.
- Firebase Storage غير مستخدَم إطلاقًا في أي ملف — يتطلّب خطة Blaze
  المدفوعة، والمشروع يعمل بالكامل على Spark المجاني (Auth + Firestore).

**الإعداد**: إعداد مشروع `tafalna` الحقيقي مضمَّن كافتراضي مباشرة داخل
`src/lib/firebase.ts` — لا خطوة يدوية مطلوبة بعد الدمج، لا في GitHub
ولا في `.env.local`. القيم ليست سرّية (مفاتيح ويب تُشحن مع أي تطبيق
وتظهر لأي زائر؛ الحماية الفعلية هي `firestore.rules` وحدها). من احتاج
مشروع Firebase مختلفًا مؤقتًا (تجربة محلية مثلًا) يقدر يتجاوز الافتراضي
عبر متغيّرات `VITE_FIREBASE_*` في `.env.local` — راجع `.env.local.example`.

---

## الخطة الأصلية (مرجع للمستقبل)

القسم التالي هو الخطة الأولى الأوسع لربط Firebase — تبديل طبقة
التخزين بالكامل عبر `StorageAdapter`، ورفع الصور إلى Storage، وإشعارات
push. لم يُنفَّذ أي من هذا بعد؛ استُبدل الجزء الخاص بالمصادقة والمزامنة
بالتصميم الأبسط أعلاه (رمز عشوائي بدل حسابات Google/جوال)، لكن الخطوات
الخاصة بالصور والإشعارات تبقى مرجعًا صالحًا حين تُفعَّل خطة Blaze لاحقًا.

---

## ١. نقطة الوصل الوحيدة

كل التطبيق يتعامل مع البيانات عبر `src/data/dataService.ts`، وهذا بدوره
يتعامل مع **واجهة واحدة** معرَّفة في `src/data/storage.ts`:

```ts
export interface StorageAdapter {
  read(): Promise<ReadResult>
  write(data: AppData): Promise<void>
  subscribe(onExternalChange: (data: AppData) => void): () => void
  usage(): Promise<StorageUsage>
}
```

اليوم يحقّقها `LocalStorageAdapter`. الربط يعني كتابة `FirestoreAdapter`
يحقّق الواجهة نفسها، ثم تبديل سطر واحد:

```ts
// src/data/dataService.ts
let adapter: StorageAdapter = new FirestoreAdapter(familyId)
```

**لا شاشة واحدة تحتاج تعديلًا.** هذا ما جرى تجهيزه.

---

## ٢. ما جُهِّز مسبقًا

| التجهيز | أين | لماذا |
|--------|-----|-------|
| كل عمليات الكتابة `async` وترجع `Promise<boolean>` | `dataService.ts` | Firestore غير متزامن؛ تغيير التواقيع لاحقًا كان سيلمس كل شاشة |
| `void` صريح عند كل كتابة لا تُنتظر نتيجتها | كل الشاشات | يجعل الكتابات الشبكية مرئية عند المراجعة |
| حالة `loading` / `error` / `readOnly` | `useDataStatus()` | الشبكة تفشل وتتأخّر — الواجهة تحتاج تعبيرًا عن ذلك |
| `subscribe` للتغييرات الخارجية | `StorageAdapter` | اليوم: تبويب آخر. غدًا: جهاز الأب |
| `useAppSelector(fn)` | `dataService.ts` | يمنع إعادة تصيير التطبيق كله مع كل مزامنة واردة |
| `familyId` في `AppData` | `types.ts` | مفتاح مستند العائلة في Firestore |
| `authorUid?` على الصور والرسائل والكبسولات | `types.ts` | `author: 'mom' \| 'dad'` اختيار عرضي لا هوية |
| `storagePath?` و`remoteUrl?` على `Photo` | `types.ts` | الصور تنتقل من Data URL إلى Storage |
| `photoSrc(photo)` | `lib/image.ts` | مصدر واحد لمنطق عرض الصورة — يتغيّر في مكان واحد |
| تحقّق صارم من كل صف وارد | `migrate.ts` | بيانات الشبكة غير موثوقة كبيانات الملف تمامًا |

---

## ٣. نموذج البيانات المقترح في Firestore

`AppData` اليوم كائن واحد. Firestore سقفه **١ ميجابايت للمستند**،
وقواعد الأمان تُكتب لكل مجموعة — لذا يُقسَّم:

```
families/{familyId}
  ├─ child            (خريطة: الاسم، الجنس، التواريخ، الوالدان)
  ├─ members          (خريطة: uid → 'mom' | 'dad')
  └─ createdAt
families/{familyId}/photos/{photoId}       ← الصورة نفسها في Storage
families/{familyId}/journal/{entryId}
families/{familyId}/capsules/{capsuleId}
families/{familyId}/milestones/{id}
families/{familyId}/appointments/{id}
families/{familyId}/kicks/{id}
families/{familyId}/contractions/{id}
families/{familyId}/momLogs/{id}
families/{familyId}/names/{id}
families/{familyId}/checklist/{id}
families/{familyId}/feedings/{id}
families/{familyId}/diapers/{id}
families/{familyId}/sleep/{id}
families/{familyId}/growth/{id}
families/{familyId}/vaccines/{id}
```

الصور في Storage تحت: `families/{familyId}/photos/{photoId}.jpg`

---

## ٤. قواعد الأمان (مسوّدة)

القاعدة الحاكمة: **لا أحد يقرأ عائلةً ليس عضوًا فيها.**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isMember(familyId) {
      return request.auth != null
        && exists(/databases/$(database)/documents/families/$(familyId))
        && request.auth.uid in get(/databases/$(database)/documents/families/$(familyId)).data.members;
    }

    match /families/{familyId} {
      // الإنشاء مسموح لمن يضع نفسه عضوًا — وإلا لأمكن خلق عائلة لغيره
      allow create: if request.auth != null
                    && request.auth.uid in request.resource.data.members;
      allow read, update: if isMember(familyId);
      allow delete: if false;   // الحذف عبر إجراء مُدار لا من العميل

      match /{collection}/{docId} {
        allow read, write: if isMember(familyId);
      }
    }
  }
}
```

قواعد Storage المقابلة:

```javascript
service firebase.storage {
  match /b/{bucket}/o {
    match /families/{familyId}/{allPaths=**} {
      allow read, write: if request.auth != null
        && firestore.exists(/databases/(default)/documents/families/$(familyId))
        && request.auth.uid in firestore.get(/databases/(default)/documents/families/$(familyId)).data.members;
    }
  }
}
```

> اختبروا القواعد بـ `firebase emulators:start` قبل النشر. قاعدة خاطئة
> هنا تعني ذكريات عائلة مكشوفة للعالم.

---

## ٥. ترتيب التنفيذ

الترتيب مقصود: كل خطوة تعمل وحدها ويمكن التوقّف عندها.

### الخطوة ١ — المصادقة وربط الوالدين
- `firebase/auth` بمزوّد Google أو رقم الجوال.
- بعد أول دخول: إنشاء مستند عائلة و`familyId`.
- **كود دعوة** (٦ أحرف) ينضمّ به الطرف الثاني إلى العائلة نفسها.
- شاشة جديدة: `features/auth/` — والباقي بلا تغيير.

### الخطوة ٢ — ترحيل البيانات المحلية
عند أول دخول ووجود بيانات محلية: اسألوا «نرفع ذكرياتكم إلى الحساب؟»
ثم ارفعوها **دون حذف المحلية** حتى يتأكد النجاح. استخدموا
`exportSnapshot()` كمصدر، ولا تمسحوا المحلي قبل تأكيد الرفع.

### الخطوة ٣ — Firestore للنصوص
- اكتبوا `FirestoreAdapter`.
- `onSnapshot` لكل مجموعة → يُغذّي `subscribe`.
- فعّلوا `enableIndexedDbPersistence` — تعمل بلا إنترنت وتزامن لاحقًا،
  وهذا وحده يحلّ مشكلتَي السقف والمزامنة معًا.

### الخطوة ٤ — Storage للصور
- عند الإضافة: ارفعوا الملف، واحفظوا `storagePath` بدل `dataUrl`.
- `photoSrc()` تُعدَّل مرة واحدة لتُرجع `remoteUrl`.
- بهذا يسقط سقف الـ ٥ ميجا نهائيًا (أهم مكسب عملي من الربط كله).

### الخطوة ٥ — الإشعارات (اختياري)
`firebase/messaging` للرضعة القادمة والمواعيد والتطعيمات المستحقة.

---

## ٦. الإعداد والمفاتيح

```bash
npm install firebase
```

`.env.local` (مُتجاهَل في `.gitignore` مسبقًا):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> مفاتيح Firebase للويب ليست سرًّا — تُشحن مع الحزمة ويراها أي أحد.
> **الحماية الحقيقية هي قواعد الأمان أعلاه، لا إخفاء المفاتيح.**
> ومع ذلك نبقيها في `.env.local` لتسهيل تبديل بيئتَي التجربة والإنتاج.

---

## ٧. ما يجب ألّا يُنسى

- **لا تمسحوا التخزين المحلي** بعد الربط. أبقوه نسخة احتياطية باردة
  ومصدرًا للعمل بلا إنترنت.
- **أبقوا زر النسخة الاحتياطية.** الحساب السحابي قد يُقفل أو يُفقد،
  والملف على جهاز الأهل يبقى.
- **`readOnly` موجودة لسبب.** حين يتعذّر قراءة الحالة الصحيحة، التطبيق
  يمتنع عن الكتابة بدل أن يدهس ما لا يفهمه — أبقوا هذا السلوك مع الشبكة.
