# Logout All

TypeScript demo for managing sessions across devices. The React/Vite web client and Expo mobile app use a Bun/Express API backed by MongoDB and Redis. The API revokes sessions and sends logout notifications through Server-Sent Events (SSE).

Follow the instructions for the area you change:

- [Frontend instructions](frontend/AGENTS.md) for the web app in `frontend/`.
- [Mobile instructions](mobile/AGENTS.md) for the Expo app in `mobile/`.
- [Backend instructions](server/AGENTS.md) for the API in `server/`.

At the repository root, `Makefile` defines development and Docker commands, `nginx/` contains proxy configuration, and `FLOW.md` explains the session flow. Keep commits focused with concise Conventional Commit summaries. Never commit credentials or log passwords, tokens, or session identifiers.
