import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { LandingPage } from './components/LandingPage'
import type { AuthSession } from './services/authService'
import './App.css'

function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)

  return authSession
    ? <Dashboard authSession={authSession} onSignedOut={() => setAuthSession(null)} />
    : <LandingPage onAuthenticated={setAuthSession} />
}

export default App
