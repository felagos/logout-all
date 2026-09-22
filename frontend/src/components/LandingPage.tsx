import { AccessPanel } from './AccessPanel'
import type { AuthSession } from '../services/authService'

type LandingPageProps = {
  onAuthenticated: (authSession: AuthSession) => void
}

export function LandingPage({ onAuthenticated }: LandingPageProps) {
  return (
    <main className="site-shell">
      <header className="site-nav">
        <a className="wordmark" href="#top" aria-label="Logout All home">
          <span>LA</span> Logout All
        </a>
        <a className="nav-link" href="#how-it-works">How it works</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Session control</p>
          <h1>Every device. One clear decision.</h1>
          <p className="hero-summary">
            See where your account is active, then end a single session or every session in moments.
          </p>
        </div>
        <div className="hero-visual">
          <img src="/session-workspace.png" alt="Person working beside a laptop and phone in a quiet workspace" />
        </div>
        <AccessPanel onAuthenticated={onAuthenticated} />
      </section>

      <section className="principles" id="how-it-works" aria-labelledby="principles-title">
        <div className="principles-intro">
          <h2 id="principles-title">Security should stay understandable.</h2>
          <p>Logout All keeps the important controls close and the next action obvious.</p>
        </div>
        <div className="principle-list">
          <article>
            <strong>See the full picture</strong>
            <p>Review active sessions with device, network, and activity details in one place.</p>
          </article>
          <article>
            <strong>Keep the session you need</strong>
            <p>Sign out this device without disturbing the rest of your work.</p>
          </article>
          <article>
            <strong>End every session when it matters</strong>
            <p>Broadcast a logout to every signed-in device as soon as you need it.</p>
          </article>
        </div>
      </section>

      <section className="detail-section">
        <img src="/device-detail.png" alt="Laptop and phone resting on a dark stone desk" loading="lazy" />
        <div>
          <h2>Make a clean break.</h2>
          <p>When a device is lost, shared, or simply no longer yours, end access without guessing what is still connected.</p>
        </div>
      </section>
      <footer>Logout All - Multi-device session management</footer>
    </main>
  )
}
