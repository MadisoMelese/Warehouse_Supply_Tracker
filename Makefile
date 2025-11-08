.PHONY: help build up down restart logs clean dev test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker compose build

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## View logs from all services
	docker compose logs -f

logs-backend: ## View backend logs
	docker compose logs -f backend

logs-frontend: ## View frontend logs
	docker compose logs -f frontend

logs-db: ## View database logs
	docker compose logs -f postgres

dev: ## Start services in development mode
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

clean: ## Stop services and remove volumes
	docker compose down -v

rebuild: ## Rebuild and restart all services
	docker compose up -d --build

migrate: ## Run database migrations
	docker compose exec backend npx prisma migrate deploy

seed: ## Seed the database
	docker compose exec backend npm run seed

shell-backend: ## Open shell in backend container
	docker compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker compose exec frontend sh

shell-db: ## Open PostgreSQL shell
	docker compose exec postgres psql -U warehouse_user -d warehouse_db

test: ## Run tests (if available)
	docker compose exec backend npm test || echo "No tests configured"

ps: ## Show status of all services
	docker compose ps

