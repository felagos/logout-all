# Logout All - Backend Server

A lightweight authentication server built with Express.js and Bun runtime providing comprehensive session management with passive validation for Netflix-style multi-device logout functionality.

## Features

- **User Authentication** - Registration and login with JWT tokens (24h expiry)
- **Session Management** - Track active sessions across multiple devices
- **Passive Session Validation** - Check if session is active on demand (no real-time notifications)
- **Multi-device Logout** - Logout from current device or all devices simultaneously
- **MongoDB Integration** - User data and session persistence
- **Docker Support** - Full containerization with Docker Compose
- **Health Monitoring** - Health check endpoints and monitoring
- **TypeScript Support** - Full TypeScript implementation
- **Hot Reloading** - Development with nodemon

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (user data and sessions)
- **Authentication**: JWT with bcrypt password hashing
- **Session Validation**: HTTP REST endpoints (POST /validate-session)
- **Containerization**: Docker + Docker Compose

## Prerequisites

- [Bun](https://bun.sh) installed
- [Docker](https://www.docker.com/) and Docker Compose (for containerized setup)
- OR manually: MongoDB running locally

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Start everything (MongoDB + Redis + Server)
make backend

# View logs
make logs

# Stop services
make stop
```

### Option 2: Development Mode

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env .env.local

# Start MongoDB and Redis manually
# Then start the development server:
bun run dev
```

The server will start on http://localhost:3001

## API Endpoints

### Authentication & Session Management

- `POST /api/auth/register` - Register a new user (creates initial session)
- `POST /api/auth/login` - Login user (creates new session)
- `POST /api/auth/logout` - Logout from current device (invalidates session)
- `POST /api/auth/logout-all` - Logout from all devices (invalidates all user sessions)
- `POST /api/auth/validate-session` - Validate if current session is active (core endpoint for Netflix-style validation)
- `GET /api/auth/sessions` - Get all active sessions with device info

### Health & Monitoring

- `GET /health` - Server health check with database connectivity

## Environment Variables

Create a `.env` file:

```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
MONGODB_URI=mongodb://localhost:27017/logout-all
```

## Session Management Architecture

The application uses a passive session validation system (Netflix-style):

1. **Session Creation** - Each login creates a tracked session with device info, stored in MongoDB with `isActive: true`
2. **JWT Issuance** - Token contains `userId` and `sessionId`
3. **Passive Validation** - On demand, frontend calls `POST /api/auth/validate-session`
4. **Backend Check** - Queries `Session.findOne({userId, sessionId})` and verifies `isActive` flag
5. **Logout-All** - Updates all user sessions to `isActive: false`
6. **Discovery** - Other devices discover logout-all on their next validation attempt (no real-time notification)
5. **Multi-device Logout** - Instant notifications to all connected devices

## Usage Examples

### Register and Login
```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "password123"}'

# Login (returns JWT token and session info)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "password123"}'
```

### Session Management
```bash
# Get all active sessions
curl -X GET http://localhost:3001/api/auth/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Logout from all devices (triggers real-time notifications)
curl -X POST http://localhost:3001/api/auth/logout-all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Real-time Events
```bash
# Connect to SSE stream for real-time notifications
curl -X GET "http://localhost:3001/api/auth/events?token=YOUR_JWT_TOKEN" \
  -H "Accept: text/event-stream"
```

## Docker Setup

### Services
- **logout-all-server** - Main application server
- **mongo** - MongoDB database with initialization script
- **redis** - Redis for session management and SSE

### Available Commands
```bash
make backend     # Start all services
make logs        # View logs
make stop        # Stop all services  
make restart     # Restart with rebuild
```

## Project Structure

```
server/
├── index.ts                    # Express server setup
├── config/
│   └── database.ts            # MongoDB connection
├── models/
│   ├── User.ts                # User model
│   └── Session.ts             # Session model
├── routes/
│   └── auth.ts                # Authentication routes
├── services/
│   ├── SSEManager.ts          # Server-Sent Events manager
│   └── RedisSSEManager.ts     # Redis-based SSE implementation
├── docker-compose.yml         # Production Docker setup
├── docker-compose.dev.yml     # Development Docker setup
├── Dockerfile                 # Production container
├── Dockerfile.dev             # Development container
├── init-mongo.js              # MongoDB initialization
└── .env                        # Environment variables
```

## Database Schemas

### User Model
```typescript
{
  _id: ObjectId,
  email: string (unique, required),
  password: string (hashed, required),
  name: string (required),
  createdAt: Date,
  updatedAt: Date
}
```

### Session Model
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  sessionId: string (unique),
  deviceInfo: string,
  ipAddress: string,
  userAgent: string,
  lastActivity: Date,
  createdAt: Date
}
```

## Security Features

- **Password Hashing** - bcrypt with salt rounds
- **JWT Authentication** - Secure token-based auth
- **Session Tracking** - Device and IP monitoring
- **CORS Configuration** - Properly configured for frontend
- **Environment Secrets** - Secure secret management
- **Input Validation** - Request validation and sanitization

## Development

### Hot Reloading (Local)
```bash
bun run dev  # Uses nodemon for file watching
```

### Docker Development (with auto-reload)
```bash
make dev-docker    # Start with volume mounting for live reload
make dev-logs      # View development logs
make dev-stop      # Stop development environment
```