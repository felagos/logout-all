import { useState } from 'react'
import './App.css'

function App() {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [token, setToken] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState<Array<{ sessionId: string; deviceInfo: string; ipAddress: string; lastActivity: string; createdAt: string }>>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const validateSessionForPlayback = async () => {
    if (!token || !sessionId) {
      alert('No active session');
      return false;
    }

    try {
      const response = await fetch('http://localhost/api/auth/validate-session', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        alert('Session invalidated. Please sign in again.');
        logout();
        return false;
      }

      return true;
    } catch (err) {
      alert('Session validation error');
      console.error(err);
      return false;
    }
  };

  const playContent = async () => {
    const isValid = await validateSessionForPlayback();
    if (isValid) {
      alert('✅ Playing content... Session is valid!');
    }
  };

  const handleAuth = async (isLogin: boolean) => {
    try {
      const url = `http://localhost/api/auth/${isLogin ? 'login' : 'register'}`;
      const body = isLogin 
        ? { email, password }
        : { email, password, name };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        loadSessions(data.token);
      } else {
        alert(data.error);
      }
    } catch {
      alert('Network error');
    }
  };

  const loadSessions = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setSessions(data.sessions);
      }
    } catch {
      console.error('Failed to load sessions');
    }
  };

  const logout = () => {
    setUser(null);
    setToken('');
    setSessionId('');
    setSessions([]);
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      logout();
    } catch {
      console.error('Logout failed');
    }
  };

  const handleLogoutAll = async () => {
    try {
      const response = await fetch('http://localhost/api/auth/logout-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        setUser(null);
        setToken('');
        setSessionId('');
        setSessions([]);
      }
    } catch {
      console.error('Logout all failed');
    }
  };

  if (user) {
    return (
      <div className="app">
        <h1>Welcome, {user.name}!</h1>
        <p>Email: {user.email}</p>
        
        <div className="actions">
          <button onClick={playContent} className="primary">
            ▶️ Play Content
          </button>
          <button onClick={handleLogout}>Logout This Device</button>
          <button onClick={handleLogoutAll} className="danger">
            Logout All Devices
          </button>
          <button onClick={() => loadSessions(token)}>
            Refresh Sessions
          </button>
        </div>

        <div className="sessions">
          <h2>Active Sessions ({sessions.length})</h2>
          {sessions.map((session) => (
            <div key={session.sessionId} className="session">
              <div><strong>{session.deviceInfo}</strong></div>
              <div>IP: {session.ipAddress}</div>
              <div>Last Activity: {new Date(session.lastActivity).toLocaleString()}</div>
              <div>Created: {new Date(session.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>{isRegistering ? 'Register' : 'Login'}</h1>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        handleAuth(!isRegistering);
      }}>
        {isRegistering && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <button type="submit">
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>

      <button 
        onClick={() => setIsRegistering(!isRegistering)}
        className="link"
      >
        {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
      </button>
    </div>
  );
}

export default App
