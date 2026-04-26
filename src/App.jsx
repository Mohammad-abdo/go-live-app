import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import RequireAuth from '@/components/RequireAuth'
import Splash from '@/pages/Splash'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'
import AppShell from '@/pages/AppShell'
import Home from '@/pages/Home'
import Trips from '@/pages/Trips'
import Safety from '@/pages/Safety'
import Account from '@/pages/Account'
import Payment from '@/pages/Payment'
import Notifications from '@/pages/Notifications'
import Support from '@/pages/Support'
import Addresses from '@/pages/Addresses'
import TripChat from '@/pages/TripChat'
import ActiveTrip from '@/pages/ActiveTrip'
import RateTrip from '@/pages/RateTrip'
import HelpCenter from '@/pages/HelpCenter'
import PersonalInfo from '@/pages/PersonalInfo'
import EditProfile from '@/pages/EditProfile'
import Wallet from '@/pages/Wallet'
import Language from '@/pages/Language'
import Legal from '@/pages/Legal'
import Signup from '@/pages/Signup'
import DriverSignup from '@/pages/DriverSignup'
import VerifyOtp from '@/pages/VerifyOtp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-driver" element={<DriverSignup />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="trips" element={<Trips />} />
          <Route path="safety" element={<Safety />} />
          <Route path="account" element={<Account />} />
          <Route path="payment" element={<Payment />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="support" element={<Support />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="trip/:rideId/rate" element={<RateTrip />} />
          <Route path="trip/:rideId" element={<ActiveTrip />} />
          <Route path="chat" element={<TripChat />} />
          <Route path="help" element={<HelpCenter />} />
          <Route path="personal" element={<PersonalInfo />} />
          <Route path="personal/edit" element={<EditProfile />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="language" element={<Language />} />
          <Route path="legal" element={<Legal />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  )
}
