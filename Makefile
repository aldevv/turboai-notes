.PHONY: all install install-backend install-frontend backend frontend dev migrate stop \
        docker-build docker-up docker-down docker-migrate

all: install migrate dev

# ── Local ────────────────────────────────────────────────────────────────────

install: install-backend install-frontend

install-backend:
	cd backend && \
	if command -v uv >/dev/null 2>&1; then \
		uv sync; \
	else \
		python -m venv .venv && . .venv/bin/activate && pip install . && pip install black flake8; \
	fi

install-frontend:
	cd frontend && npm install

migrate:
	cd backend && \
	if command -v uv >/dev/null 2>&1; then \
		uv run python manage.py migrate; \
	else \
		. .venv/bin/activate && python manage.py migrate; \
	fi

backend:
	cd backend && \
	if command -v uv >/dev/null 2>&1; then \
		uv run python manage.py runserver 8000; \
	else \
		. .venv/bin/activate && python manage.py runserver 8000; \
	fi

frontend:
	cd frontend && npm run dev

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
	docker compose up

docker-down:
	docker compose down

docker-migrate:
	docker compose exec backend uv run python manage.py migrate
