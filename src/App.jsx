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
import HelpCenter from '@/pages/HelpCenter'
import Signup from '@/pages/Signup'
import VerifyOtp from '@/pages/VerifyOtp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
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
          <Route path="chat" element={<TripChat />} />
          <Route path="help" element={<HelpCenter />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  )
}
