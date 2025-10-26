.PHONY: help install dev build test clean docker staging frontend server logs stop

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  install     - Install dependencies for both frontend and server"
	@echo "  dev         - Start development servers (run server and frontend in separate terminals)"
	@echo "  server      - Start server in development mode (bun)"
	@echo "  frontend    - Start frontend in development mode (npm)"
	@echo "  build       - Build frontend and server Docker image"
	@echo "  clean       - Clean node_modules and build artifacts"
	@echo ""
	@echo "Docker Development (with auto-reload):"
	@echo "  dev-docker  - Start development environment with Docker (auto-reload on code changes)"
	@echo "  dev-logs    - View development Docker logs"
	@echo "  dev-stop    - Stop development Docker environment"
	@echo "  dev-restart - Restart development Docker environment"
	@echo ""
	@echo "Docker Production:"
	@echo "  backend     - Start staging environment with Docker Compose (MongoDB + Redis + Server)"
	@echo "  logs        - View staging environment logs"
	@echo "  stop        - Stop staging environment"
	@echo "  restart     - Restart staging environment and rebuild images"
	@echo ""
	@echo "URLs:"
	@echo "  Server:     http://localhost:3001"
	@echo "  Health:     http://localhost:3001/health"
	@echo "  MongoDB:    localhost:27017"
	@echo "  Redis:      localhost:6379"
	@echo ""

# Installation
install:
	@echo "Installing server dependencies..."
	cd server && bun install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ All dependencies installed"

# Development
dev:
	@echo "Starting development environment..."
	@echo "Note: Run 'make server' and 'make frontend' in separate terminals"

server:
	@echo "Starting server in development mode..."
	cd server && bun run dev

frontend:
	@echo "Starting frontend in development mode..."
	cd frontend && npm run dev

# Docker Development (with auto-reload)
dev-docker:
	@echo "Starting development environment with Docker (auto-reload enabled)..."
	cd server && docker-compose -f docker-compose.dev.yml up -d --build
	@echo "✅ Development environment started with auto-reload"
	@echo "Server: http://localhost:3001"
	@echo "Health: http://localhost:3001/health"
	@echo "MongoDB: localhost:27017"
	@echo "Redis: localhost:6379"
	@echo ""
	@echo "Code changes will automatically reload the server!"
	@echo "View logs with: make dev-logs"

dev-logs:
	@echo "Showing development Docker logs..."
	cd server && docker-compose -f docker-compose.dev.yml logs -f

dev-stop:
	@echo "Stopping development Docker environment..."
	cd server && docker-compose -f docker-compose.dev.yml down
	@echo "✅ Development environment stopped"

dev-restart:
	@echo "Restarting development Docker environment..."
	cd server && docker-compose -f docker-compose.dev.yml down
	cd server && docker-compose -f docker-compose.dev.yml up -d --build
	@echo "✅ Development environment restarted with auto-reload"
	@echo "View logs with: make dev-logs"

# Build
build:
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Building server Docker image..."
	cd server && docker build -t logout-all-server:latest .
	@echo "✅ Build completed"

backend:
	@echo "Starting environment..."
	cd server && docker-compose -f docker-compose.yml up -d
	@echo "✅ Staging environment started"
	@echo "Server: http://localhost:3001"
	@echo "Health: http://localhost:3001/health"
	@echo "MongoDB: localhost:27017"
	@echo "Redis: localhost:6379"
	@echo ""
	@echo "Waiting for services to start..."
	@timeout /t 10 /nobreak >nul 2>&1
	@echo "Checking service health..."
	@powershell -Command "try { Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing | Out-Null; Write-Host '✅ Server is healthy' } catch { Write-Host '⚠️ Server starting up, check logs with make logs' }"

logs:
	@echo "Showing staging logs..."
	cd server && docker-compose -f docker-compose.yml logs -f

stop:
	@echo "Stopping staging environment..."
	cd server && docker-compose -f docker-compose.yml down
	@echo "✅ Staging environment stopped"

restart:
	@echo "Restarting staging environment..."
	cd server && docker-compose -f docker-compose.yml down
	cd server && docker-compose -f docker-compose.yml up -d --build
	@echo "✅ Staging environment restarted"
	@echo "Waiting for services..."
	@sleep 15
	@echo "Checking health..."
	@powershell -Command "try { Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing | Out-Null; Write-Host '✅ Server is healthy' } catch { Write-Host '⚠️ Check logs with make logs' }"

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	rm -rf server/node_modules
	@echo "✅ Cleanup completed"