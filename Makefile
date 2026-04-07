.PHONY: all install install-backend install-frontend backend frontend dev migrate stop

all: install migrate dev

install: install-backend install-frontend

install-backend:
	cd backend && python -m venv venv && . venv/bin/activate && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

migrate:
	cd backend && . venv/bin/activate && python manage.py migrate

backend:
	cd backend && . venv/bin/activate && python manage.py runserver 8000

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) backend &
	$(MAKE) frontend

stop:
	-pkill -f "manage.py runserver" 2>/dev/null
	-pkill -f "next dev" 2>/dev/null
