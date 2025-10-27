import { useState } from 'react'
import './AppSimple.css'

interface Device {
  sessionId: string;
  deviceInfo: string;
  ipAddress: string;
  lastActivity: string;
  createdAt: string;
}

function AppSimple() {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [token, setToken] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // Cargar dispositivos
  const loadDevices = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost/api/auth/sessions', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  // Validar sesión (como si fuera a reproducir contenido)
  const validateSessionForPlayback = async () => {
    if (!token || !sessionId) {
      showMessage('No active session', 'error');
      return false;
    }

    try {
      const response = await fetch('http://localhost/api/auth/validate-session', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        showMessage('Session invalidated. Please sign in again.', 'error');
        logout();
        return false;
      }

      return true;
    } catch (error) {
      showMessage('Session validation error', 'error');
      console.error(error);
      return false;
    }
  };

  // Simular reproducción de contenido
  const playContent = async () => {
    setLoading(true);
    const isValid = await validateSessionForPlayback();
    setLoading(false);

    if (isValid) {
      showMessage('✅ Playing content... Session is valid!', 'success');
      setTimeout(() => showMessage('', 'info'), 3000);
    }
  };

  // Auth
  const handleAuth = async (isLogin: boolean) => {
    try {
      setLoading(true);
      const url = `http://localhost/api/auth/${isLogin ? 'login' : 'register'}`;
      const body = isLogin
        ? { email, password }
        : { email, password, name };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setToken(data.token);
        setSessionId(data.sessionId);
        setEmail('');
        setPassword('');
        setName('');
        showMessage(isLogin ? 'Login successful!' : 'Registration successful!', 'success');
        await loadDevices(data.token);
      } else {
        showMessage(data.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Logout actual dispositivo
  const logout = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setUser(null);
        setToken('');
        setSessionId('');
        setDevices([]);
        showMessage('Logged out successfully', 'success');
      }
    } catch (error) {
      showMessage('Logout error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT FROM ALL DEVICES
  const logoutAllDevices = async () => {
    if (!window.confirm('Sign out from all devices? You will need to sign in again.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost/api/auth/logout-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setUser(null);
        setToken('');
        setSessionId('');
        setDevices([]);
        showMessage('✅ Signed out from all devices. Other devices will be logged out on next activity.', 'success');
      } else {
        showMessage(data.error || 'Failed to logout all devices', 'error');
      }
    } catch (err) {
      showMessage('Logout all error', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  return (
    <div className="app-simple">
      <header className="header">
        <h1>🎬 Netflix-Style Logout</h1>
        <p>Session validation on demand, no real-time updates</p>
      </header>

      {message && (
        <div className={`message message-${messageType}`}>
          {message}
        </div>
      )}

      {!user ? (
        // LOGIN/REGISTER
        <div className="auth-container">
          <div className="auth-form">
            <h2>{isRegistering ? 'Create Account' : 'Sign In'}</h2>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            {isRegistering && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            )}

            <button
              onClick={() => handleAuth(isRegistering ? false : true)}
              disabled={loading}
            >
              {loading ? 'Loading...' : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>

            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="btn-secondary"
              disabled={loading}
            >
              {isRegistering ? 'Already have an account?' : 'Create new account'}
            </button>
          </div>
        </div>
      ) : (
        // MAIN APP
        <div className="main-container">
          <div className="user-section">
            <h2>👤 Welcome, {user.name}!</h2>
            <p>{user.email}</p>
          </div>

          {/* CONTENT PLAYBACK SIMULATION */}
          <div className="playback-section">
            <h3>📺 Content Playback</h3>
            <p>Click to simulate content playback (validates session)</p>
            <button
              onClick={playContent}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Validating...' : '▶ Play Content'}
            </button>
            <p className="info-text">
              🔍 Each playback validates your session with the server.
              If you've been logged out, playback will fail.
            </p>
          </div>

          {/* ACTIVE DEVICES */}
          <div className="devices-section">
            <h3>📱 Active Devices</h3>
            {devices.length === 0 ? (
              <p className="no-devices">No active devices</p>
            ) : (
              <ul className="device-list">
                {devices.map((device, idx) => (
                  <li key={idx} className="device-item">
                    <div className="device-info">
                      <span className="device-name">{device.deviceInfo}</span>
                      <span className="device-ip">{device.ipAddress}</span>
                      <span className="device-time">
                        {new Date(device.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* LOGOUT BUTTONS */}
          <div className="logout-section">
            <button
              onClick={logout}
              disabled={loading}
              className="btn-secondary"
            >
              {loading ? 'Logging out...' : '🚪 Sign Out This Device'}
            </button>

            <button
              onClick={logoutAllDevices}
              disabled={loading}
              className="btn-danger"
            >
              {loading ? 'Processing...' : '🚨 Sign Out All Devices'}
            </button>
          </div>

          {/* EXPLANATION */}
          <div className="explanation">
            <h4>📌 How Netflix-style logout works:</h4>
            <ul>
              <li>✅ Sign in creates a session on the server</li>
              <li>🎬 Each content playback validates your session</li>
              <li>🚪 "Sign out all devices" invalidates all sessions immediately</li>
              <li>⏱️ Other devices don't know they're logged out until they try to play</li>
              <li>🔄 No real-time notifications or WebSockets needed</li>
            </ul>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Simple Logout All • Netflix-Style Architecture</p>
      </footer>
    </div>
  );
}

export default AppSimple;
