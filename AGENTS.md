# Repository Guidelines

## Project Structure & Module Organization

This is a TypeScript full-stack session-management demo. `frontend/` is a React/Vite app; UI code and styles live in `frontend/src/`, and static files in `frontend/public/`. `server/` is a Bun/Express API. Keep HTTP handlers in `server/routes/`, Mongoose schemas in `server/models/`, shared event-stream logic in `server/services/`, and database setup in `server/config/`. Root-level `nginx/`, `Makefile`, and `FLOW.md` cover proxying, workflows, and architecture.

## Build, Test, and Development Commands

- `make install` installs server dependencies with Bun and frontend dependencies with npm.
- `make server` starts the API with Nodemon on port 3001; `make frontend` starts Vite on port 5173. Run them in separate terminals.
- `make dev-docker` starts MongoDB, Redis, and the API with hot reload; `make dev-logs` and `make dev-stop` inspect or stop it.
- `cd frontend && npm run lint` checks TypeScript and React ESLint rules.
- `cd frontend && npm run build` type-checks and creates the production bundle.
- `make build` builds the frontend and the server Docker image.
- `cd server && bun run test-db` checks database connectivity after services are running.

## Coding Style & Naming Conventions

Use TypeScript and two-space indentation. Follow surrounding quote and semicolon style; frontend and backend differ slightly. Name React components and Mongoose models in `PascalCase`, variables and functions in `camelCase`, and service files after their responsibility (for example, `RedisSSEManager.ts`). Keep route handlers thin and shared connection or SSE behavior in services.

## Testing Guidelines

No automated unit-test framework or coverage threshold is configured. Run frontend lint and build, then exercise affected API flows manually. For authentication or SSE changes, verify registration/login, `GET /api/auth/sessions`, single-device logout, and logout-all from two browser sessions. Name future tests `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines

Recent history follows concise Conventional Commit prefixes such as `feat:`, `fix:`, `refactor:`, and `chore:`. Keep each commit focused and use an imperative summary. Pull requests should explain behavior changes, list verification commands, link relevant issues, and include screenshots for UI changes. Call out environment, Docker, API, or authentication impacts explicitly.

## Security & Configuration

Store local values in `server/.env`; never commit real JWT secrets or credentials. Document new variables and provide safe example values. Preserve authentication checks and avoid logging tokens, passwords, or session identifiers.
