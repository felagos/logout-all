import { useState } from 'react'
import type { FormEvent } from 'react'
import { authenticate } from '../services/authService'
import type { AuthSession } from '../services/authService'

type AccessPanelProps = {
  onAuthenticated: (authSession: AuthSession) => void
}

export function AccessPanel({ onAuthenticated }: AccessPanelProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setIsSubmitting(true)

    try {
      const authSession = await authenticate(
        isRegistering ? { email, password, name } : { email, password },
      )
      onAuthenticated(authSession)
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'The service is unavailable. Check that the local stack is running.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const formTitle = isRegistering ? 'Create your workspace' : 'Open your workspace'

  return (
    <section className="access-panel" aria-labelledby="access-title">
      <div>
        <p className="panel-kicker">Your account</p>
        <h2 id="access-title">{formTitle}</h2>
      </div>

      <form onSubmit={handleAuth} noValidate>
        {isRegistering && (
          <label>
            <span>Name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
        )}
        <label>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {authError && <p className="form-error" role="alert">{authError}</p>}
        <button className="button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Working...' : isRegistering ? 'Create account' : 'Enter dashboard'}
        </button>
      </form>

      <button
        className="text-button"
        type="button"
        onClick={() => {
          setIsRegistering((current) => !current)
          setAuthError('')
        }}
      >
        {isRegistering ? 'I already have an account' : 'Create an account'}
      </button>
    </section>
  )
}
