# TurboAI Notes

[![Tests](https://github.com/aldevv/turboai-notes/actions/workflows/test.yml/badge.svg)](https://github.com/aldevv/turboai-notes/actions/workflows/test.yml)
[![Lint](https://github.com/aldevv/turboai-notes/actions/workflows/lint.yml/badge.svg)](https://github.com/aldevv/turboai-notes/actions/workflows/lint.yml)
[![Format](https://github.com/aldevv/turboai-notes/actions/workflows/format.yml/badge.svg)](https://github.com/aldevv/turboai-notes/actions/workflows/format.yml)
[![Release](https://github.com/aldevv/turboai-notes/actions/workflows/release.yml/badge.svg)](https://github.com/aldevv/turboai-notes/actions/workflows/release.yml)

A friendly, minimal note-taking app with automatic saving and category organisation.

## Tech Stack

| Layer    | Technology                                                       |
|----------|------------------------------------------------------------------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS v4         |
| Backend  | Django 5, Django REST Framework, SQLite                          |
| Auth     | JWT via `djangorestframework-simplejwt`, stored in localStorage  |

## How to Run

### Local

```bash
make
```

Installs dependencies (uv if available, pip fallback), runs migrations, and starts both servers.

| URL | Service |
|-----|---------|
| `http://localhost:3000` | Frontend |
| `http://localhost:8000` | Backend API |

```bash
make backend    # Django dev server only (port 8000)
make frontend   # Next.js dev server only (port 3000)
make migrate    # Run DB migrations
make install    # Install all dependencies
```

### Docker

```bash
make docker-build   # Build images
make docker-up      # Start both services
make docker-down    # Stop and remove containers
```

Same URLs apply. Requires Docker with Compose.

## Design

Built from the [Notes-Taking App Challenge](https://www.figma.com/design/nIqpRyEWKPYqYsW7RMfi3S/Notes-Taking-App-Challenge) Figma design.

See [`docs/plan.md`](docs/plan.md) for the full architecture plan: data models, API contract, component structure, and integration notes.

## Key Decisions

- **JWT in localStorage** — simple for a demo; no server-side session needed.
- **SQLite** — zero config, sufficient for a single-user demo app.
- **Two serializers on NoteViewSet** — writes accept a bare category UUID; reads return a nested category object. Keeps the API clean without a custom `to_representation` on a single serializer.
- **note_count as a queryset annotation** — computed in one DB query via `Count("notes")` rather than a model property, so it's free on list and absent when not needed (e.g. inside a note).
- **No routing for the editor** — the note editor is a full-screen overlay rendered conditionally, not a separate route. Simpler state, no URL management needed.

## How This Was Built

This app was built end-to-end using [Claude Code](https://claude.ai/code), Anthropic's AI coding agent, from a Figma design file and a short video walkthrough.

**The process had three phases:**

1. **Plan** — A single Claude Code session read the Figma design and video transcript (`docs/transcript.txt`), then produced a complete architecture document (`docs/plan.md`) specifying the data models, REST API contract, component tree, TypeScript types, and integration rules. No code was written yet.

2. **Build** — Two Claude Code agents ran in parallel against the plan: one built the entire Django backend (models, serializers, views, URLs, migrations), the other built the entire Next.js frontend (types, API client, auth, hooks, components, pages). Each agent worked independently using the plan as the shared contract.

3. **Polish** — A final Claude Code session wired the two halves together, fixed integration issues, validated the running app against the Figma design using Playwright screenshots, and iterated on visual details (card layout, sidebar dimensions, mascot images, colour accuracy) until the app matched the design.

**AI tools used:**

- **Claude Code** (CLI) — primary tool for all code generation, planning, and debugging.
- **Plan mode** — used to produce `docs/plan.md` before any code was written, so both build agents shared a single source of truth.
- **Parallel sub-agents** — backend and frontend were built simultaneously by two independent Claude Code agents scoped to their respective directories.
- **Playwright MCP** — Claude Code controlled a real browser to compare the running app against the Figma design and verify fixes visually.
