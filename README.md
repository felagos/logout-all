# Logout All - Multi-Device Session Management

A full-stack application that provides secure authentication with multi-device session management and real-time logout notifications.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) (for server)
- [Node.js](https://nodejs.org) (for frontend)
- [MongoDB](https://www.mongodb.com) (for data persistence)
- [Make](https://www.gnu.org/software/make/) (for build automation)

### Setup Development Environment
```bash
# Clone and setup
git clone <repository>
cd logout-all

# One-command setup
make setup

# Start development (in separate terminals)
make server    # Terminal 1
make frontend  # Terminal 2
```

## 📋 Available Commands

### Development
```bash
make help       # Show all available commands
make install    # Install all dependencies
make dev        # Show development start instructions
make server     # Start server in development mode
make frontend   # Start frontend in development mode
make setup      # Complete environment setup
```

### Building & Testing
```bash
make build      # Build both frontend and server
make test       # Run tests and health checks
make db-test    # Test MongoDB connection
make health     # Check running application health
```

### Docker & Staging
```bash
make docker     # Build Docker image
make staging    # Start staging environment
make logs       # View staging logs
make stop       # Stop staging environment
make restart    # Restart staging with rebuild
```

### Maintenance
```bash
make clean      # Clean all build artifacts
make prod-build # Build for production
```

## 🏗️ Project Structure

```
logout-all/
├── frontend/           # React + TypeScript frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── server/             # Bun + Express backend
│   ├── routes/         # API routes
│   ├── models/         # MongoDB models
│   ├── services/       # Business logic
│   ├── config/         # Configuration
│   ├── Dockerfile      # Container configuration
│   └── package.json
├── Makefile           # Build automation
└── README.md
```

## 🎯 Features

### Authentication
- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Session management across devices

### Multi-Device Management
- Track active sessions per user
- Device information detection
- IP address and user agent logging
- Session activity tracking

### Real-Time Notifications
- Server-Sent Events (SSE) for real-time communication
- Instant logout notifications across devices
- "Logout all devices" functionality
- Automatic session cleanup

### Security
- JWT token validation
- Session-based authentication
- Non-root Docker containers
- CORS protection
- Input validation and sanitization

## 🔧 Development Workflow

### Local Development
1. **Setup**: `make setup`
2. **Start MongoDB**: `mongod` or `brew services start mongodb-community`
3. **Start Server**: `make server` (Terminal 1)
4. **Start Frontend**: `make frontend` (Terminal 2)
5. **Access**: 
   - Frontend: http://localhost:5173
   - Server: http://localhost:3001
   - Health: http://localhost:3001/health

The Vite development server listens on the local network. To test from a phone on the same Wi-Fi, open `http://<your-LAN-IP>:5173`. Frontend API and SSE requests use the same origin and are proxied to the backend automatically.

For the Docker development stack, run `make up` and use the same phone URL. MongoDB and Redis remain bound to `127.0.0.1` and are not exposed to other devices on the network.

### Staging Environment
```bash
# Start staging with Docker
make staging

# Monitor logs
make logs

# Stop staging
make stop
```

### Testing the Feature
1. Open multiple browser tabs/windows
2. Register/login on each tab
3. View active sessions in the UI
4. Click "Logout All Devices" on one tab
5. Watch other tabs receive real-time logout notifications

## 🐳 Docker Deployment

### Staging
- **Server**: Bun-based container with security hardening
- **Database**: MongoDB with persistent storage
- **Networking**: Isolated Docker bridge network
- **Health Checks**: Automatic container health monitoring

### Commands
```bash
make staging    # Start staging environment
make logs       # View container logs
make restart    # Rebuild and restart
make stop       # Stop all containers
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Logout current device
- `POST /api/auth/logout-all` - Logout all devices
- `GET /api/auth/sessions` - List active sessions
- `GET /api/auth/events` - SSE event stream

### Health
- `GET /health` - Application health check

## 🔐 Environment Variables

### Server (.env)
```bash
JWT_SECRET=your-super-secret-key
PORT=3001
MONGODB_URI=mongodb://localhost:27017/logout-all
NODE_ENV=development
API_PROXY_TARGET=http://nginx
APP_BIND_ADDRESS=0.0.0.0
INFRA_BIND_ADDRESS=127.0.0.1
```

### Staging (.env.staging)
```bash
JWT_SECRET=staging-secret-key
PORT=3001
MONGODB_URI=mongodb://mongo:27017/logout-all
NODE_ENV=staging
```

## 🧪 Testing

```bash
# Test database connection
make db-test

# Test application health
make health

# Run type checking
make test
```

## 🚀 Production Deployment

```bash
# Build for production
make prod-build

# Deploy using Docker Compose
docker-compose -f server/docker-compose.staging.yml up -d

# Or deploy individual containers
docker run -d -p 3001:3001 logout-all-server:production
```

## 📚 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for development and building
- **CSS3** for styling
- **EventSource API** for real-time updates

### Backend
- **Bun** runtime for performance
- **Express.js** for API framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcrypt** for password hashing
- **Server-Sent Events** for real-time communication

### DevOps
- **Docker** for containerization
- **Docker Compose** for orchestration
- **Make** for build automation
- **MongoDB** for data persistence

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `make test`
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.
