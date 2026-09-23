# Frontend Guidelines

This directory contains the React/Vite web client. Components and styles live in `src/`, API calls in `src/services/`, and static assets in `public/`. Keep session and authentication behavior consistent with the API and mobile client.

## Development

- Run `npm run dev` for Vite on port 5173.
- Run `npm run lint` for ESLint and `npm run build` for TypeScript checking and the production bundle.
- Use TypeScript with two-space indentation. Follow the existing quote and semicolon style; name React components in `PascalCase` and functions and variables in `camelCase`.

## Session Behavior

- Keep HTTP requests and SSE URL construction in `src/services/authService.ts`; manage the event connection with the component that uses it. Preserve authentication checks and clear local session state when the API revokes a session or sends `logout-all`.
- For changes to authentication or SSE, manually verify registration and login, the sessions view, single-device logout, and logout-all with two browser sessions. There is no configured unit-test runner; name future tests `*.test.ts` or `*.test.tsx`.
- Include screenshots in pull requests for visible UI changes.
