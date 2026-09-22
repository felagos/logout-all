import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type User = { id: string; email: string; name: string }
type Session = { sessionId: string; deviceInfo: string; ipAddress: string; lastActivity: string; createdAt: string }

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [notifications, setNotifications] = useState<string[]>([])

  useEffect(() => {
    if (!token || !sessionId) return
    const eventSource = new EventSource(`http://localhost/api/auth/events?token=${encodeURIComponent(token)}`)
    eventSource.addEventListener('logout-all', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        setNotifications((current) => [...current, data.message])
      } catch {
        setNotifications((current) => [...current, 'Your sessions were signed out.'])
      }
      window.setTimeout(() => {
        setUser(null)
        setToken('')
        setSessionId('')
        setSessions([])
      }, 2000)
    })
    return () => eventSource.close()
  }, [token, sessionId])

  const loadSessions = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost/api/auth/sessions', { headers: { Authorization: `Bearer ${authToken}` } })
      const data = await response.json()
      if (response.ok) setSessions(data.sessions)
    } catch {
      setNotifications((current) => [...current, 'Sessions could not be refreshed.'])
    }
  }

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setIsSubmitting(true)
    try {
      const response = await fetch(`http://localhost/api/auth/${isRegistering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegistering ? { email, password, name } : { email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAuthError(data.error ?? 'We could not complete that request.')
        return
      }
      setUser(data.user)
      setToken(data.token)
      setSessionId(data.sessionId)
      setEmail('')
      setPassword('')
      setName('')
      void loadSessions(data.token)
    } catch {
      setAuthError('The service is unavailable. Check that the local stack is running.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('http://localhost/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    } finally {
      setUser(null)
      setToken('')
      setSessionId('')
      setSessions([])
    }
  }

  const handleLogoutAll = async () => {
    try {
      const response = await fetch('http://localhost/api/auth/logout-all', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (!response.ok) {
        setNotifications((current) => [...current, data.error ?? 'All sessions could not be ended.'])
        return
      }
      setNotifications((current) => [...current, data.message])
      setUser(null)
      setToken('')
      setSessionId('')
      setSessions([])
    } catch {
      setNotifications((current) => [...current, 'All sessions could not be ended.'])
    }
  }

  if (user) return <Dashboard name={user.name} sessions={sessions} notifications={notifications} onRefresh={() => void loadSessions(token)} onLogout={() => void handleLogout()} onLogoutAll={() => void handleLogoutAll()} />

  return <LandingPage email={email} password={password} name={name} isRegistering={isRegistering} isSubmitting={isSubmitting} error={authError} onEmailChange={setEmail} onPasswordChange={setPassword} onNameChange={setName} onToggle={() => { setIsRegistering((current) => !current); setAuthError('') }} onSubmit={handleAuth} />
}

type LandingPageProps = {
  email: string; password: string; name: string; isRegistering: boolean; isSubmitting: boolean; error: string
  onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onNameChange: (value: string) => void
  onToggle: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function LandingPage({ email, password, name, isRegistering, isSubmitting, error, onEmailChange, onPasswordChange, onNameChange, onToggle, onSubmit }: LandingPageProps) {
  const formTitle = isRegistering ? 'Create your workspace' : 'Open your workspace'
  return (
    <main className="site-shell">
      <header className="site-nav">
        <a className="wordmark" href="#top" aria-label="Logout All home"><span>LA</span> Logout All</a>
        <a className="nav-link" href="#how-it-works">How it works</a>
      </header>
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Session control</p>
          <h1>Every device. One clear decision.</h1>
          <p className="hero-summary">See where your account is active, then end a single session or every session in moments.</p>
        </div>
        <div className="hero-visual"><img src="/session-workspace.png" alt="Person working beside a laptop and phone in a quiet workspace" /></div>
        <section className="access-panel" aria-labelledby="access-title">
          <div><p className="panel-kicker">Your account</p><h2 id="access-title">{formTitle}</h2></div>
          <form onSubmit={onSubmit} noValidate>
            {isRegistering && <label><span>Name</span><input type="text" autoComplete="name" value={name} onChange={(event) => onNameChange(event.target.value)} required /></label>}
            <label><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => onEmailChange(event.target.value)} required /></label>
            <label><span>Password</span><input type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} value={password} onChange={(event) => onPasswordChange(event.target.value)} required /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Working...' : isRegistering ? 'Create account' : 'Enter dashboard'}</button>
          </form>
          <button className="text-button" type="button" onClick={onToggle}>{isRegistering ? 'I already have an account' : 'Create an account'}</button>
        </section>
      </section>
      <section className="principles" id="how-it-works" aria-labelledby="principles-title">
        <div className="principles-intro"><h2 id="principles-title">Security should stay understandable.</h2><p>Logout All keeps the important controls close and the next action obvious.</p></div>
        <div className="principle-list">
          <article><strong>See the full picture</strong><p>Review active sessions with device, network, and activity details in one place.</p></article>
          <article><strong>Keep the session you need</strong><p>Sign out this device without disturbing the rest of your work.</p></article>
          <article><strong>End every session when it matters</strong><p>Broadcast a logout to every signed-in device as soon as you need it.</p></article>
        </div>
      </section>
      <section className="detail-section"><img src="/device-detail.png" alt="Laptop and phone resting on a dark stone desk" loading="lazy" /><div><h2>Make a clean break.</h2><p>When a device is lost, shared, or simply no longer yours, end access without guessing what is still connected.</p></div></section>
      <footer>Logout All - Multi-device session management</footer>
    </main>
  )
}

type DashboardProps = { name: string; sessions: Session[]; notifications: string[]; onRefresh: () => void; onLogout: () => void; onLogoutAll: () => void }
function Dashboard({ name, sessions, notifications, onRefresh, onLogout, onLogoutAll }: DashboardProps) {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-nav"><a className="wordmark" href="#dashboard" aria-label="Logout All dashboard"><span>LA</span> Logout All</a><button className="text-button" type="button" onClick={onLogout}>Sign out</button></header>
      <div className="notification-stack" aria-live="polite">{notifications.map((notification, index) => <p key={`${notification}-${index}`}>{notification}</p>)}</div>
      <section className="dashboard-heading" id="dashboard"><p className="eyebrow">Active access</p><h1>Welcome back, {name}.</h1><p>Review every connected device, then choose what stays signed in.</p></section>
      <section className="session-toolbar" aria-label="Session controls"><div><span>{sessions.length}</span> active {sessions.length === 1 ? 'session' : 'sessions'}</div><div className="session-actions"><button className="button-secondary" type="button" onClick={onRefresh}>Refresh</button><button className="button-danger" type="button" onClick={onLogoutAll}>Sign out everywhere</button></div></section>
      <section className="session-grid" aria-label="Active sessions">
        {sessions.length > 0 ? sessions.map((session) => <article className="session-card" key={session.sessionId}><div className="session-card-top"><h2>{session.deviceInfo}</h2><span>Active</span></div><dl><div><dt>Network</dt><dd>{session.ipAddress}</dd></div><div><dt>Last active</dt><dd>{new Date(session.lastActivity).toLocaleString()}</dd></div><div><dt>Signed in</dt><dd>{new Date(session.createdAt).toLocaleString()}</dd></div></dl></article>) : <div className="empty-sessions"><h2>No sessions to show</h2><p>Refresh to check for recent activity.</p></div>}
      </section>
    </main>
  )
}

export default App
