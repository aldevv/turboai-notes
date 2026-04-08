# TurboAI Notes

Full-stack notes app. Django backend, Next.js frontend.

## Structure

```
backend/    # Django 5 + DRF, SQLite, JWT auth
frontend/   # Next.js 16, React 19, TypeScript, Tailwind v4
Makefile    # unified dev and Docker commands
docker-compose.yml
```

## Running

```bash
make              # install + migrate + dev servers
make docker-up    # run via Docker instead
```

See `backend/CLAUDE.md` and `frontend/CLAUDE.md` for service-specific details.
