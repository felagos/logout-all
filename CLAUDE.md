# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make install       # bun install (server) + npm install (frontend)
make server        # cd server && bun run dev (nodemon, port 3001)
make frontend      # cd frontend && npm run dev (vite, port 5173)
make build         # frontend build + server docker image
make dev-docker    # server stack (server+Mongo+Redis) in Docker w/ auto-reload
make dev-logs / dev-stop / dev-restart
make backend       # production Docker Compose stack (Mongo + Redis + Server + nginx LB), waits then hits /health
make logs / stop / restart
make clean
```

No test suite exists (`server` package.json `test` script is a stub). `server/test-db.ts` (run via `bun run test-db`) checks the MongoDB connection only. Frontend lint: `cd frontend && npm run lint` (eslint). Frontend typecheck/build: `cd frontend && npm run build` (`tsc -b && vite build`).

Manual SSE test: `curl -H "Accept: text/event-stream" "http://localhost:3001/api/auth/events?token=JWT_TOKEN"`.

## Architecture

Multi-device session manager: login/register issues a JWT embedding `sessionId`; "logout all" must invalidate every other session for that user and push a live notification to their open tabs/devices, even when those devices are connected to a **different server instance**. That cross-instance requirement is why Redis pub/sub exists — do not "simplify" it away.

### Request flow
`server/index.ts` — Express app, mounts `server/routes/auth.ts` at `/api/auth`, exposes `/health` (reports Redis + connection stats via `redisSSEManager.getServerStats()`).

All auth/session logic lives in `server/routes/auth.ts` directly (no separate controller layer): register, login, logout, logout-all, sessions list, and the SSE `events` endpoint. `authenticateToken` middleware reads the Bearer JWT and attaches `{ userId, sessionId }` to `req.user`.

- Every login/register creates a `Session` document (`server/models/Session.ts`) with `userId`, `sessionId`, device info, IP, user agent — auth without a tracked session is not a valid pattern here.
- `/logout-all` marks all of a user's sessions `isActive: false` in Mongo, then calls `redisSSEManager.sendToUserExceptSession(userId, sessionId, 'logout-all', ...)` to notify every *other* open connection.
- SSE auth is via `?token=` query param (`/api/auth/events?token=...`), not headers — EventSource can't set custom headers, so this is intentional, not a shortcut.

### Redis SSE coordination (`server/services/RedisSSEManager.ts`)
Each server process keeps only its own SSE clients in an in-memory `localClients: Map<sessionId, Response>`. Cross-instance delivery works via:
- `sse-events` pub/sub channel — publishing an event does not deliver locally, it round-trips through Redis, whose subscriber then calls `sendToLocalClients` (this also fires on the *publishing* server, since it's also a subscriber).
- `session:{sessionId}` hash and `user:{userId}:sessions` set in Redis track which sessions exist and which server holds them (24h TTL), used to filter local delivery by `userId`.
- `SERVER_ID` env var (or a random suffix if unset) identifies the instance in logs/stats — must be unique per instance when running multiple servers behind the LB.
- `getConnectedDevicesCount`/`getServerStats` read from Redis, not just local state, since sessions can be spread across servers.

`server/services/SSEManager.ts` exists alongside `RedisSSEManager.ts` — check which one routes actually import (currently `RedisSSEManager`) before assuming both are live.

### Data layer
`server/config/database.ts` — Mongo connection (Mongoose). Models: `User` (auth), `Session` (per-login device/session tracking, `isActive` flag). No repository/service abstraction beyond `RedisSSEManager` — business logic sits directly in route handlers.

### Frontend
Vite + React 19 + TypeScript, no external state library — plain hooks. After login, opens `new EventSource('/api/auth/events?token=...')` and listens for the `logout-all` event to trigger auto-logout on that device.

### Deployment topology
`nginx/` load-balances across server replicas (see README "Server 1: http://localhost:3001 (dev mode only)" and Makefile `Load Balancer: http://localhost`). Because there can be N server instances behind the LB, any feature touching sessions or SSE must go through Redis, not local process state, or it will only work when the LB happens to route both requests to the same instance.

Env: use `.env.staging` (not `.env`) for the staging/Docker stack. Required vars: `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `SERVER_ID`.
