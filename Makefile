.PHONY: all install install-backend install-frontend backend frontend dev migrate stop \
        docker-build docker-up docker-down docker-migrate

all: install migrate dev

# ── Local ────────────────────────────────────────────────────────────────────

install: install-backend install-frontend

install-backend:
	./scripts/backend.sh install

install-frontend:
	./scripts/frontend.sh install

migrate:
	./scripts/backend.sh migrate

backend:
	./scripts/backend.sh run

frontend:
	./scripts/frontend.sh run

dev:
	$(MAKE) backend &
	$(MAKE) frontend

stop:
	-pkill -f "manage.py runserver" 2>/dev/null
	-pkill -f "next dev" 2>/dev/null

# ── Docker ───────────────────────────────────────────────────────────────────

docker-build:
	docker compose build

docker-up:
	@touch backend/db.sqlite3
	docker compose up --build

docker-down:
	docker compose down

docker-migrate:
	docker compose exec backend uv run python manage.py migrate
