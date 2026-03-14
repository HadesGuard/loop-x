# Make targets for Loop project (backend + containers)
# Usage examples:
#   make backend-install
#   make backend-test
#   make docker-up-prod

.PHONY: backend-install backend-build backend-test backend-lint backend-typecheck docker-build docker-up-prod docker-down-prod db-up help

help:
	@echo "Available targets:"
	@echo "  backend-install   - pnpm install in loop-backend"
	@echo "  backend-build     - TypeScript build"
	@echo "  backend-test      - Run unit tests"
	@echo "  backend-lint      - ESLint"
	@echo "  backend-typecheck - TypeScript noEmit check"
	@echo "  db-up             - Start Postgres+Redis for local dev"
	@echo "  docker-build      - Build backend image"
	@echo "  docker-up-prod    - Start prod stack (backend+db+redis)"
	@echo "  docker-down-prod  - Stop prod stack"

backend-install:
	cd loop-backend && pnpm install --frozen-lockfile

backend-build:
	cd loop-backend && pnpm build

backend-test:
	cd loop-backend && pnpm test

backend-lint:
	cd loop-backend && pnpm lint

backend-typecheck:
	cd loop-backend && pnpm type-check

# Start local dev DB/Redis using provided compose file
db-up:
	docker compose -f loop-backend/docker-compose.db.yml up -d

# Production-like build/run
docker-build:
	docker build -t loop-backend:latest -f loop-backend/Dockerfile loop-backend

docker-up-prod:
	docker compose -f docker-compose.prod.yml up -d --build

docker-down-prod:
	docker compose -f docker-compose.prod.yml down
