# Logout All - Frontend

A React TypeScript frontend for the logout-all application, providing user authentication and session management with Netflix-style passive validation.

## Features

- **User Authentication** - Login and registration
- **Session Management** - View all active sessions with device info, IP addresses, and timestamps
- **Passive Validation** - "Play Content" button validates session on demand before allowing action
- **Multi-device Logout** - Logout from current device or all devices simultaneously
- **Responsive Design** - Clean, modern UI with dark theme

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **CSS3** with custom styling (Netflix-style dark theme)
- **REST API** for backend communication (no WebSocket/SSE)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Backend server running on `http://localhost:3001`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## API Integration

The frontend connects to the backend server at `http://localhost:3001` and uses the following endpoints:

- `POST /api/auth/login` - User login (creates session)
- `POST /api/auth/register` - User registration (creates session)
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/logout-all` - Logout all sessions
- `POST /api/auth/validate-session` - Check if current session is active (called before playing content)
- `GET /api/auth/sessions` - Get user's active sessions

## Netflix-Style Passive Validation

When users click "Play Content", the frontend:
1. Calls `POST /api/auth/validate-session` to check if the session is still active
2. Backend checks if session has `isActive: true` in MongoDB
3. If valid → user can proceed
4. If invalid (after logout-all) → user is redirected to login

Other devices discover logout-all on their next play attempt, not through real-time notifications.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.
