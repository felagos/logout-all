# Logout All - Frontend

A React TypeScript frontend for the logout-all application, providing user authentication and session management with real-time notifications.

## Features

- **User Authentication** - Login and registration
- **Session Management** - View all active sessions with device info, IP addresses, and timestamps
- **Real-time Notifications** - Server-Sent Events (SSE) for logout notifications
- **Multi-device Logout** - Logout from current device or all devices simultaneously
- **Responsive Design** - Clean, modern UI with dark theme

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **CSS3** with custom styling
- **Server-Sent Events** for real-time communication

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

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/logout-all` - Logout all sessions
- `GET /api/auth/sessions` - Get user's active sessions
- `GET /api/auth/events` - SSE endpoint for real-time notifications

## Real-time Features

The application uses Server-Sent Events to receive real-time logout notifications. When a user triggers "logout all devices", other sessions receive immediate notifications before being automatically logged out.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.
