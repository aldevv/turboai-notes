#!/usr/bin/env bash
set -e

COMMAND=${1:-run}

if command -v uv >/dev/null 2>&1; then
    case "$COMMAND" in
        install)  cd backend && uv sync ;;
        migrate)  cd backend && uv run python manage.py migrate ;;
        run)      cd backend && uv run python manage.py runserver 8000 ;;
    esac
else
    case "$COMMAND" in
        install)  cd backend && python -m venv .venv && . .venv/bin/activate && pip install . && pip install black flake8 ;;
        migrate)  cd backend && . .venv/bin/activate && python manage.py migrate ;;
        run)      cd backend && . .venv/bin/activate && python manage.py runserver 8000 ;;
    esac
fi
