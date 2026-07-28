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
import { useAppData, useStorageStatus } from './data/dataService'

export default function App() {
  const location = useLocation()
  const data = useAppData()
  const storage = useStorageStatus()

  if (!data.setupComplete) return <Onboarding />

  return (
    <div className="app-container">
      {storage.state === 'error' && (
        <div
          role="alert"
          className="sticky top-0 z-50 bg-red-700 text-white text-sm px-4 py-3 shadow-lg print:hidden"
        >
          <strong className="block">الحفظ غير متاح</strong>
          <span>{storage.message}</span>
        </div>
      )}
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
