import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './features/home/Home'
import PregnancyHub from './features/pregnancy/PregnancyHub'
import KicksScreen from './features/pregnancy/KicksScreen'
import ContractionsScreen from './features/pregnancy/ContractionsScreen'
import AppointmentsScreen from './features/pregnancy/AppointmentsScreen'
import DevelopmentScreen from './features/pregnancy/DevelopmentScreen'
import MomScreen from './features/pregnancy/MomScreen'
import MemoriesHub from './features/memories/MemoriesHub'
import JournalScreen from './features/memories/JournalScreen'
import CapsulesScreen from './features/memories/CapsulesScreen'
import MilestonesScreen from './features/memories/MilestonesScreen'
import MemoryBook from './features/memories/MemoryBook'
import PrepHub from './features/prep/PrepHub'
import NamesScreen from './features/prep/NamesScreen'
import ChecklistScreen from './features/prep/ChecklistScreen'
import BabyCare from './features/baby-care/BabyCare'
import FeedingScreen from './features/baby-care/FeedingScreen'
import DiapersScreen from './features/baby-care/DiapersScreen'
import SleepScreen from './features/baby-care/SleepScreen'
import GrowthScreen from './features/baby-care/GrowthScreen'
import VaccinesScreen from './features/baby-care/VaccinesScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import Onboarding from './features/onboarding/Onboarding'
import { useAppData, useDataStatus, type DataStatus } from './data/dataService'

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
    <div className="app-container">
      <StatusBanner status={status} />
      <main className="screen animate-in" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/pregnancy" element={<PregnancyHub />} />
          <Route path="/pregnancy/development" element={<DevelopmentScreen />} />
          <Route path="/pregnancy/kicks" element={<KicksScreen />} />
          <Route path="/pregnancy/contractions" element={<ContractionsScreen />} />
          <Route path="/pregnancy/appointments" element={<AppointmentsScreen />} />
          <Route path="/pregnancy/mom" element={<MomScreen />} />

          <Route path="/memories" element={<MemoriesHub />} />
          <Route path="/memories/journal" element={<JournalScreen />} />
          <Route path="/memories/capsules" element={<CapsulesScreen />} />
          <Route path="/memories/milestones" element={<MilestonesScreen />} />
          <Route path="/memories/book" element={<MemoryBook />} />

          <Route path="/prep" element={<PrepHub />} />
          <Route path="/prep/names" element={<NamesScreen />} />
          <Route path="/prep/hospital" element={<ChecklistScreen list="hospital" />} />
          <Route path="/prep/shopping" element={<ChecklistScreen list="shopping" />} />

          <Route path="/baby-care" element={<BabyCare />} />
          <Route path="/baby-care/feeding" element={<FeedingScreen />} />
          <Route path="/baby-care/diapers" element={<DiapersScreen />} />
          <Route path="/baby-care/sleep" element={<SleepScreen />} />
          <Route path="/baby-care/growth" element={<GrowthScreen />} />
          <Route path="/baby-care/vaccines" element={<VaccinesScreen />} />

          <Route path="/settings" element={<SettingsScreen />} />

          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

/** شريط تحذير ثابت أعلى الشاشة حين يتعذّر الحفظ أو القراءة */
function StatusBanner({ status }: { status: DataStatus }) {
  if (!status.error) return null
  return (
    <div
      role="alert"
      className="sticky top-0 z-50 bg-red-700 text-white text-sm px-4 py-3 shadow-lg print:hidden"
    >
      <strong className="block">
        {status.readOnly ? 'وضع القراءة فقط' : 'الحفظ غير متاح'}
      </strong>
      <span className="leading-relaxed">{status.error}</span>
    </div>
  )
}

/** شاشة انتظار قصيرة أثناء قراءة التخزين — تمنع وميض شاشة البداية */
function BootScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-cream-50">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">👶</div>
        <p className="text-sage-400 text-sm">لحظة…</p>
      </div>
    </div>
  )
}
