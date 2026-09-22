.PHONY: help install dev build test clean docker dev-docker dev-logs dev-stop dev-restart up down backend logs stop restart server frontend

# Detect OS for cross-platform commands
ifeq ($(OS),Windows_NT)
    detected_OS := Windows
    SLEEP_CMD := powershell -Command "Start-Sleep -Seconds
else
    detected_OS := $(shell uname -s)
    SLEEP_CMD := sleep
endif

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  install     - Install dependencies for both frontend and server"
	@echo "  dev         - Start development servers (run server and frontend in separate terminals)"
	@echo "  server      - Start server in development mode (bun)"
	@echo "  frontend    - Start frontend in development mode (npm)"
	@echo "  build       - Build frontend and backend development images"
	@echo "  clean       - Clean node_modules and build artifacts"
	@echo ""
	@echo "Docker Development (with auto-reload):"
	@echo "  up          - Start frontend and backend development services with Docker Compose"
	@echo "  down        - Stop frontend and backend development services"
	@echo "  dev-docker  - Start development environment with Docker (auto-reload on code changes)"
	@echo "  dev-logs    - View development Docker logs"
	@echo "  dev-stop    - Stop development Docker environment"
	@echo "  dev-restart - Restart development Docker environment"
	@echo ""
	@echo "Docker Production:"
	@echo "  backend     - Start production environment with Docker Compose (MongoDB + Redis + Server)"
	@echo "  logs        - View production environment logs"
	@echo "  stop        - Stop production environment"
	@echo "  restart     - Restart production environment and rebuild images"
	@echo ""
	@echo "URLs:"
	@echo "  Load Balancer: http://localhost"
	@echo "  Frontend:      http://localhost:5173"
	@echo "  Phone (LAN):   http://<your-LAN-IP>:5173"
	@echo "  Health:        http://localhost/health"
	@echo "  MongoDB:       localhost:27017"
	@echo "  Redis:         localhost:6379"
	@echo ""

# Installation
install:
	@echo "Installing server dependencies..."
	cd server && bun install
	@echo "Installing frontend dependencies..."
	cd frontend && bun install
	@echo "✅ All dependencies installed"

# Full development stack
build:
	@echo "Building frontend and backend development images..."
	cd server && docker-compose -f docker-compose.dev.yml build frontend logout-all-server-1
	@echo "✅ Development images built"

up:
	@echo "Starting frontend and backend development services..."
	cd server && docker-compose -f docker-compose.dev.yml up -d --build
	@echo "✅ Frontend: http://localhost:5173"
	@echo "✅ Phone:    http://<your-LAN-IP>:5173"
	@echo "✅ Backend: http://localhost/health"

down:
	@echo "Stopping frontend and backend development services..."
	cd server && docker-compose -f docker-compose.dev.yml down
	@echo "✅ Development services stopped"
