# Backend Guidelines

This directory contains the Bun/Express API. Keep HTTP handlers in `routes/`, Mongoose schemas in `models/`, shared SSE and Redis behavior in `services/`, and database setup in `config/`. Keep route handlers thin and put shared connection behavior in services.

## Development

- Run `bun run dev` for the API on port 3001. The root `Makefile` also provides Docker development commands for MongoDB, Redis, and the API.
- Run `bun run test-db` to check database connectivity once services are running. No automated unit-test suite is configured; name future tests `*.test.ts`.
- Use TypeScript with two-space indentation and follow the existing quote and semicolon style. Name Mongoose models in `PascalCase`, functions and variables in `camelCase`, and service files after their responsibility.

## Authentication and Configuration

- Preserve authorization checks and session revocation across MongoDB, Redis, and SSE. For authentication or SSE changes, manually verify registration and login, `GET /api/auth/sessions`, single-device logout, and logout-all from two sessions.
- Keep local configuration in `.env`; never commit real secrets or credentials. Document new environment variables with safe example values. Do not log passwords, tokens, or session identifiers.
