# GitHub Copilot Instructions - Logout All

## Architecture Overview

This is a **multi-device session management system** with real-time logout notifications. The key architectural pattern is **distributed session tracking** across multiple server instances using Redis pub/sub for coordination.

### Core Components
- **Frontend**: React TypeScript (Vite) with SSE client
- **Backend**: Express.js on Bun runtime with JWT auth
- **Session Storage**: MongoDB (persistence) + Redis (real-time coordination)
- **Real-time**: Server-Sent Events (SSE) with Redis pub/sub for multi-server support

## Critical Workflow Patterns

### 1. Development Setup
Always use **Make commands** for consistency:
```bash
make dev-docker    # Docker development with auto-reload
make server        # Local Bun development  
make backend       # Production Docker stack
```

### 2. Session Management Pattern
**Every login creates a tracked session** - never just authenticate without session tracking:
```typescript
// Always create session on auth
const sessionId = uuidv4();
const session = new Session({
  userId: user._id.toString(),
  sessionId,
  deviceInfo: getDeviceInfo(req.headers['user-agent'] || ''),
  ipAddress: req.ip || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown'
});
```

### 3. Redis SSE Coordination
**Multi-server SSE coordination** via `RedisSSEManager` - essential for scaling:
- Local clients stored per server instance (`localClients` Map)
- Redis pub/sub broadcasts logout events across servers
- Server registration pattern: `user:${userId}:servers` and `server:${serverId}:users`

## Project-Specific Conventions

### File Organization
- **Services layer**: `server/services/` - put business logic here, not in routes
- **Docker variants**: `Dockerfile` (prod), `Dockerfile.dev` (dev with volume mounting)
- **Compose variants**: `docker-compose.yml` (prod), `docker-compose.dev.yml` (dev with live reload)

### Environment Patterns
- Use `.env.staging` as the main env file (not `.env`)
- **SERVER_ID** must be unique per instance for Redis coordination
- Required vars: `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `SERVER_ID`

### SSE Implementation
**Always use token in query params** for SSE auth (headers don't work reliably):
```typescript
// Frontend
const eventSource = new EventSource(`/api/auth/events?token=${encodeURIComponent(token)}`);

// Backend auth middleware for SSE
const tokenFromQuery = req.query.token as string;
```

### Authentication Flow
1. **Register/Login** → Creates session + JWT with sessionId
2. **SSE Connection** → Registers client in Redis
3. **Logout All** → Redis pub/sub → Broadcast to all servers → Close SSE connections
4. **Frontend** → Receives SSE event → Auto-logout after notification

## Integration Points

### MongoDB Schemas
- **User**: Basic auth data
- **Session**: Device tracking with `userId`, `sessionId`, `deviceInfo`, `ipAddress`
- **Indexes**: `userId` on sessions, unique `sessionId`

### Redis Patterns
- **Pub/Sub channels**: `logout-all-events`, `sse-events`
- **Key patterns**: `user:${userId}:servers`, `server:${serverId}:users`
- **TTL strategy**: 5min TTL on server registration keys

### Frontend State Management
**No external state library** - vanilla React hooks with SSE integration:
```typescript
// Always setup SSE after login
useEffect(() => {
  if (token && sessionId) {
    const eventSource = new EventSource(`/api/auth/events?token=${token}`);
    eventSource.addEventListener('logout-all', handleLogoutEvent);
    return () => eventSource.close();
  }
}, [token, sessionId]);
```

## Debugging & Monitoring

### Health Endpoints
- `GET /health` - Includes Redis stats and server info
- Use `redisSSEManager.getServerStats()` for diagnostics

### Key Logs to Watch
- **SSE connections**: Look for `📱 SSE: Client connected/disconnected`
- **Redis coordination**: `✅ Redis [connection type] established`
- **Logout broadcasts**: `🚪 Broadcasting logout-all event`

### Common Issues
- **SSE not working**: Check token format and Redis connection
- **Sessions not syncing**: Verify `SERVER_ID` uniqueness and Redis pub/sub
- **Docker reload issues**: Use `make dev-docker` for development, not production compose

## Testing Strategy
- **Health checks**: `make health` for running system verification
- **DB connectivity**: `bun run test-db` for MongoDB connection testing
- **Manual SSE testing**: `curl -H "Accept: text/event-stream" "http://localhost:3001/api/auth/events?token=JWT_TOKEN"`