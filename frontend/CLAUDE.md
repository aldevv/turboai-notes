# Frontend

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. No UI component libraries.

## Structure

```
src/app/             # routes: /, /auth/login, /auth/signup, /notes
src/components/      # auth/ and notes/ — dumb presentational components
src/contexts/        # AuthContext — user state, login(), logout()
src/hooks/           # useNotes, useCategories, useAutoSave
src/lib/api.ts       # all fetch calls — single request() helper with Bearer token
src/lib/formatDate.ts
src/types/index.ts   # shared types: Note, Category, AuthResponse, NoteUpdatePayload
```

## Code style

- Always use braces for `if` statements, even single-line ones.

## Key patterns

**Auth is localStorage-based** — `access_token`, `refresh_token`, `user` stored on login/signup. `AuthContext` reads from localStorage on mount. No token refresh — expired tokens redirect to `/auth/login` via a 401 handler in `api.ts`.

**No routing for the editor** — `NoteEditor` is a full-screen overlay rendered conditionally in `notes/page.tsx`. Selecting a note sets `selectedNote` state; closing clears it.

**Auto-save** — `useAutoSave` debounces title/content PATCHes by 500ms. Category changes PATCH immediately. After any save, the notes array is re-sorted by `last_edited_at` descending in place — no full refetch.

**Category PATCH** — always send the UUID string, or `null` to unset. Never send a nested object.

**Colours** — background `#F5F0E8`, category colours `#E8B4A8` / `#F5E6C8` / `#B8D9D1`. Inline styles are used for dynamic values (category colours on cards); Tailwind for layout and spacing.

## Running

```bash
npm run dev   # port 3000
```
