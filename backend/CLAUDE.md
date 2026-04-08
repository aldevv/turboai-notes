# Backend

Django 5 + Django REST Framework. SQLite. JWT auth via `djangorestframework-simplejwt`.

## Structure

```
config/          # project settings, root URLs
apps/accounts/   # signup, login views + serializers
apps/notes/      # Category and Note models, views, serializers
```

## Key patterns

**Two-serializer pattern on NoteViewSet** — `NoteWriteSerializer` for create/partial_update (accepts category as UUID), `NoteSerializer` for list/retrieve (returns category as nested object). `to_representation` on the write serializer delegates back to the read serializer so responses are always consistent.

**All data is user-scoped** — every queryset filters by `request.user`. Never expose cross-user data.

**Categories are fixed** — 3 created at signup (Random Thoughts, School, Personal), never added or deleted by the user. No POST/PATCH/DELETE on `/api/categories/`.

**`last_edited_at` is server-only** — `auto_now=True`, never accepted from the client.

**`note_count`** is annotated via `Count('notes')` in `CategoryListView`. It is NOT a model field and is NOT present in the category object nested inside a note.

## Auth endpoints

`POST /api/auth/signup/` and `POST /api/auth/login/` both return `{ access, refresh, user: { id, email } }`. Login is a thin wrapper around simplejwt's `TokenObtainPairView` that injects the user object into the response.

## Running

**With uv (preferred):**
```bash
uv sync                                  # first time: creates .venv and installs deps
uv run python manage.py runserver 8000
```

**Without uv (pip fallback):**
```bash
python -m venv .venv && . .venv/bin/activate
pip install .          # prod deps from pyproject.toml
pip install black flake8  # dev tools
python manage.py runserver 8000
```

```bash
# Linting / formatting
uv run python -m black apps/ config/
uv run python -m flake8 apps/ config/

# Tests
uv run python manage.py test

# Production install (no dev tools)
uv sync --no-group dev
```
