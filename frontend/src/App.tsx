import { useState, useEffect } from 'react'
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
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (token && sessionId) {
      console.log('🔌 Setting up SSE connection...');
      const eventSource = new EventSource(`http://localhost/api/auth/events?token=${encodeURIComponent(token)}`);

      eventSource.onopen = () => {
        console.log('✅ SSE connection opened');
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
      };

      eventSource.onmessage = (event) => {
        console.log('📨 SSE message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') {
            console.log('✅ SSE connected');
          }
        } catch (error) {
          console.error('❌ Error parsing SSE message:', error);
          console.error('Raw message data:', event.data);
        }
      };

      eventSource.addEventListener('logout-all', (event: MessageEvent) => {
        console.log('🚪 Logout-all event received:', event.data);
        try {
          const data = JSON.parse(event.data);
          setNotifications(prev => [...prev, data.message]);
          setTimeout(() => {
            console.log('🚪 Logging out due to logout-all event');
            setUser(null);
            setToken('');
            setSessionId('');
            setSessions([]);
          }, 2000);
        } catch (error) {
          console.error('❌ Error parsing logout-all event:', error);
          console.error('Raw event data:', event.data);
        }
      });

      return () => {
        console.log('🔌 Closing SSE connection');
        eventSource.close();
      };
    }
  }, [token, sessionId]);

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

  const handleLogout = async () => {
    try {
      await fetch('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setUser(null);
      setToken('');
      setSessionId('');
      setSessions([]);
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
        <div className="notifications">
          {notifications.map((notification, index) => (
            <div key={index} className="notification">
              {notification}
            </div>
          ))}
        </div>
        
        <h1>Welcome, {user.name}!</h1>
        <p>Email: {user.email}</p>
        
        <div className="actions">
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
