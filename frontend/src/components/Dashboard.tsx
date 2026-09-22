import { useEffect, useState } from 'react'
import { createAuthEventsUrl, fetchSessions, logout, logoutAll } from '../services/authService'
import type { AuthSession, Session } from '../services/authService'

type DashboardProps = {
  authSession: AuthSession
  onSignedOut: () => void
}

export function Dashboard({ authSession, onSignedOut }: DashboardProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [notifications, setNotifications] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()

    void fetchSessions(authSession.token, controller.signal)
      .then(setSessions)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setNotifications((current) => [...current, 'Sessions could not be refreshed.'])
      })

    return () => controller.abort()
  }, [authSession.token])

  useEffect(() => {
    const eventSource = new EventSource(createAuthEventsUrl(authSession.token))
    let logoutTimer: number | undefined

    eventSource.addEventListener('logout-all', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        setNotifications((current) => [...current, data.message])
      } catch {
        setNotifications((current) => [...current, 'Your sessions were signed out.'])
      }
      logoutTimer = window.setTimeout(onSignedOut, 2000)
    })

    return () => {
      eventSource.close()
      if (logoutTimer !== undefined) window.clearTimeout(logoutTimer)
    }
  }, [authSession.token, onSignedOut])

  const loadSessions = async () => {
    try {
      setSessions(await fetchSessions(authSession.token))
    } catch {
      setNotifications((current) => [...current, 'Sessions could not be refreshed.'])
    }
  }

  const handleLogout = async () => {
    try {
      await logout(authSession.token)
    } finally {
      onSignedOut()
    }
  }

  const handleLogoutAll = async () => {
    try {
      const message = await logoutAll(authSession.token)
      setNotifications((current) => [...current, message])
      onSignedOut()
    } catch (error) {
      setNotifications((current) => [
        ...current,
        error instanceof Error ? error.message : 'All sessions could not be ended.',
      ])
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-nav">
        <a className="wordmark" href="#dashboard" aria-label="Logout All dashboard">
          <span>LA</span> Logout All
        </a>
        <button className="text-button" type="button" onClick={() => void handleLogout()}>
          Sign out
        </button>
      </header>

      <div className="notification-stack" aria-live="polite">
        {notifications.map((notification, index) => (
          <p key={`${notification}-${index}`}>{notification}</p>
        ))}
      </div>

      <section className="dashboard-heading" id="dashboard">
        <p className="eyebrow">Active access</p>
        <h1>Welcome back, {authSession.user.name}.</h1>
        <p>Review every connected device, then choose what stays signed in.</p>
      </section>

      <section className="session-toolbar" aria-label="Session controls">
        <div>
          <span>{sessions.length}</span> active {sessions.length === 1 ? 'session' : 'sessions'}
        </div>
        <div className="session-actions">
          <button className="button-secondary" type="button" onClick={() => void loadSessions()}>
            Refresh
          </button>
          <button className="button-danger" type="button" onClick={() => void handleLogoutAll()}>
            Sign out everywhere
          </button>
        </div>
      </section>

      <section className="session-grid" aria-label="Active sessions">
        {sessions.length > 0 ? sessions.map((session) => (
          <article className="session-card" key={session.sessionId}>
            <div className="session-card-top">
              <h2>{session.deviceInfo}</h2>
              <span>Active</span>
            </div>
            <dl>
              <div><dt>Network</dt><dd>{session.ipAddress}</dd></div>
              <div><dt>Last active</dt><dd>{new Date(session.lastActivity).toLocaleString()}</dd></div>
              <div><dt>Signed in</dt><dd>{new Date(session.createdAt).toLocaleString()}</dd></div>
            </dl>
          </article>
        )) : (
          <div className="empty-sessions">
            <h2>No sessions to show</h2>
            <p>Refresh to check for recent activity.</p>
          </div>
        )}
      </section>
    </main>
  )
}
