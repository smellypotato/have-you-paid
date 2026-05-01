import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ProfileDisplayPatchProvider } from './lib/profileDisplayPatch'
import './App.css'
import { AppLayout } from './components/AppLayout'
import { JoinIntentRecovery } from './components/JoinIntentRecovery'
import { Home } from './pages/Home'
import { JoinPage } from './pages/JoinPage'
import { SessionPage } from './pages/SessionPage'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename || undefined}>
        <ProfileDisplayPatchProvider>
          <JoinIntentRecovery />
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/join/:sessionId" element={<JoinPage />} />
              <Route path="/session/:sessionId" element={<SessionPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProfileDisplayPatchProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
