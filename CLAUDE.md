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

## Pull Requests

Descriptions should be short and high-level — summarise what the branch does, not every file changed. One short paragraph or a few bullet points is enough.
