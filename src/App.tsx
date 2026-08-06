import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import { CaptureProvider } from './components/Capture'
import { EmbraceMark } from './components/illustrations'
import Today from './features/today/Today'
import Story from './features/story/Story'
import MemoryBook from './features/story/MemoryBook'
import CapsulesScreen from './features/story/CapsulesScreen'
import MilestonesScreen from './features/story/MilestonesScreen'
import Track from './features/track/Track'
import KicksScreen from './features/track/KicksScreen'
import ContractionsScreen from './features/track/ContractionsScreen'
import AppointmentsScreen from './features/track/AppointmentsScreen'
import DevelopmentScreen from './features/track/DevelopmentScreen'
import MomScreen from './features/track/MomScreen'
import FeedingScreen from './features/track/FeedingScreen'
import DiapersScreen from './features/track/DiapersScreen'
import SleepScreen from './features/track/SleepScreen'
import GrowthScreen from './features/track/GrowthScreen'
import VaccinesScreen from './features/track/VaccinesScreen'
import NamesScreen from './features/track/NamesScreen'
import ChecklistScreen from './features/track/ChecklistScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import Onboarding from './features/onboarding/Onboarding'
import { useAppData, useDataStatus, type DataStatus } from './data/dataService'
import FamilySyncBridge from './data/FamilySyncBridge'

export default function App() {
  const location = useLocation()
  const data = useAppData()
  const status = useDataStatus()

  // كل انتقال يبدأ من أعلى الشاشة — بدونها تفتح الشاشة الجديدة
  // من منتصفها لأن المتصفح يحتفظ بموضع التمرير السابق.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  if (status.loading) return <BootScreen />

  // التحذير يسبق كل شيء — بما في ذلك شاشة البداية.
  // حين تتعذّر قراءة البيانات المحفوظة يبدو التطبيق وكأنه جديد تمامًا،
  // فلو لم يظهر التحذير هنا لأعاد المستخدم التسجيل ظانًّا أن ذكرياته ضاعت،
  // بينما هي سليمة على الجهاز تنتظر الاستعادة.
  if (!data.setupComplete) {
    return (
      <>
        <StatusBanner status={status} />
        <Onboarding />
      </>
    )
  }

  return (
    <CaptureProvider>
      <FamilySyncBridge />
      <div className="app-shell">
        <StatusBanner status={status} />
        <main className="screen animate-rise" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Today />} />

            <Route path="/story" element={<Story />} />
            <Route path="/story/book" element={<MemoryBook />} />
            <Route path="/story/capsules" element={<CapsulesScreen />} />
            <Route path="/story/milestones" element={<MilestonesScreen />} />

            <Route path="/track" element={<Track />} />
            <Route path="/track/development" element={<DevelopmentScreen />} />
            <Route path="/track/kicks" element={<KicksScreen />} />
            <Route path="/track/contractions" element={<ContractionsScreen />} />
            <Route path="/track/appointments" element={<AppointmentsScreen />} />
            <Route path="/track/mom" element={<MomScreen />} />
            <Route path="/track/feeding" element={<FeedingScreen />} />
            <Route path="/track/diapers" element={<DiapersScreen />} />
            <Route path="/track/sleep" element={<SleepScreen />} />
            <Route path="/track/growth" element={<GrowthScreen />} />
            <Route path="/track/vaccines" element={<VaccinesScreen />} />
            <Route path="/track/names" element={<NamesScreen />} />
            <Route path="/track/hospital" element={<ChecklistScreen list="hospital" />} />
            <Route path="/track/shopping" element={<ChecklistScreen list="shopping" />} />

            <Route path="/settings" element={<SettingsScreen />} />

            <Route path="*" element={<Today />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </CaptureProvider>
  )
}

/** شريط تحذير ثابت أعلى الشاشة حين يتعذّر الحفظ أو القراءة */
function StatusBanner({ status }: { status: DataStatus }) {
  if (!status.error) return null
  return (
    <div
      role="alert"
      className="sticky z-40 bg-clay-700 text-white text-sm px-5 py-3 shadow-lift print:hidden"
      // يلتصق تحت شريط الحالة لا خلفه: top: 0 كان يُخفي نصّه عند التمرير.
      style={{ top: 'env(safe-area-inset-top)' }}
    >
      <strong className="block font-display">
        {status.readOnly ? 'وضع القراءة فقط' : 'الحفظ غير متاح'}
      </strong>
      <span className="leading-relaxed">{status.error}</span>
    </div>
  )
}

/** شاشة انتظار قصيرة أثناء قراءة التخزين — تمنع وميض شاشة البداية */
function BootScreen() {
  return (
    <div className="min-h-dvh grid place-items-center bg-paper-100">
      <div className="text-center animate-fade">
        <EmbraceMark className="w-20 h-14 mx-auto text-clay-300" />
        <p className="text-ink-400 text-sm mt-3">لحظة…</p>
      </div>
    </div>
  )
}
