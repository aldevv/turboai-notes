# Notes-Taking App — Coordinator Plan

## Context

Build a notes-taking app from a Figma design and video spec. Three-step process:
1. **Planning** (this file): define the full contract so two agents can build independently
2. **Build**: one agent for Django backend, one for Next.js frontend — in parallel
3. **Synthesize**: one agent checks both implementations and wires them together

Readability and simplicity are the priority. Demo-quality, not production-hardened.

---

## Requirements Summary (from video transcript)

**Auth:**
- Signup: email + password + show/hide toggle + link to login
- Login: email + password + link to signup
- On signup: auto-create 3 categories: "Random Thoughts", "School", "Personal"

**Notes:**
- Click "+ New Note" → note created immediately via POST, editor opens with the returned note
- Auto-save: debounced PATCH (~500ms) on every title/content keystroke — no manual save button
- Category change fires PATCH immediately (discrete click, not keystroke)
- `last_edited_at` updates server-side (`auto_now=True`); shown in editor updating in real-time (optimistic)

**Categories (fixed, 3 per user):**
- Random Thoughts → `#E8B4A8` (peach)
- School → `#F5E6C8` (pale yellow)
- Personal → `#B8D9D1` (teal)
- Sidebar shows color dot, name, note count
- Click category to filter notes; "All Categories" to show all

**Notes list:**
- Grid of preview cards: formatted date, category badge, title, truncated content
- Card border/tint uses category color
- Date format: "Today" | "Yesterday" | "Jan 15" (no year, no time)

**Empty state:** friendly illustration when no notes exist

---

## Design Specs (from Figma)

- Background: `#F5F1ED` (cream/beige)
- Text: warm brown tones
- Typography: serif for headings, sans-serif for body
- Sidebar on left; notes grid in main area
- Note detail = full-screen overlay (not a separate route)
- Mascots: sleeping panda on auth screens, happy coffee cup for empty state
- Rounded corners, soft aesthetic throughout

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript, TailwindCSS |
| Backend | Django 5, Django REST Framework, SQLite |
| Auth | JWT via `djangorestframework-simplejwt`, stored in `localStorage` |
| Dev ports | Frontend: 3000, Backend: 8000 |
| CORS | Backend allows `http://localhost:3000` |

---

## Data Models (Django)

```python
# Category — owned by a user, 3 auto-created on signup
class Category(models.Model):
    id         = UUIDField(primary_key=True, default=uuid.uuid4)
    user       = ForeignKey(User, on_delete=CASCADE, related_name='categories')
    name       = CharField(max_length=100)
    color      = CharField(max_length=7)  # hex e.g. "#E8B4A8"
    created_at = DateTimeField(auto_now_add=True)
    class Meta: ordering = ['created_at']

# Note — belongs to user, optionally categorized
class Note(models.Model):
    id             = UUIDField(primary_key=True, default=uuid.uuid4)
    user           = ForeignKey(User, on_delete=CASCADE, related_name='notes')
    category       = ForeignKey(Category, on_delete=SET_NULL, null=True, blank=True)
    title          = TextField(blank=True, default='')
    content        = TextField(blank=True, default='')
    last_edited_at = DateTimeField(auto_now=True)
    created_at     = DateTimeField(auto_now_add=True)
    class Meta: ordering = ['-last_edited_at']
```

Django built-in `User` model — no custom model. `username` is set to `email` at signup.

---

## REST API Contract

### Base URL: `http://localhost:8000/api/`
### Auth header: `Authorization: Bearer <access_token>`

### Auth

| Method | Path | Auth? | Description |
|--------|------|-------|-------------|
| POST | `/api/auth/signup/` | No | Create account + default categories |
| POST | `/api/auth/login/` | No | Get tokens |
| POST | `/api/auth/refresh/` | No | Refresh access token |

**POST /api/auth/signup/** request:
```json
{ "email": "user@example.com", "password": "secret123" }
```
Response `201`:
```json
{ "access": "<token>", "refresh": "<token>", "user": { "id": 1, "email": "user@example.com" } }
```
Side effect: creates 3 default categories for this user.

**POST /api/auth/login/** — same request/response shape as signup but `200`.

### Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories/` | List user's categories with note counts |

Response `200`:
```json
[
  { "id": "uuid", "name": "Random Thoughts", "color": "#E8B4A8", "note_count": 3 },
  { "id": "uuid", "name": "School",          "color": "#F5E6C8", "note_count": 1 },
  { "id": "uuid", "name": "Personal",        "color": "#B8D9D1", "note_count": 0 }
]
```
`note_count` from server-side `Count('notes')` annotation. No POST/PATCH/DELETE — categories are fixed.

### Notes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes/` | List notes, optional `?category=<uuid>` filter |
| POST | `/api/notes/` | Create blank note immediately |
| GET | `/api/notes/<id>/` | Get single note |
| PATCH | `/api/notes/<id>/` | Update fields (auto-save) |
| DELETE | `/api/notes/<id>/` | Delete note |

**GET /api/notes/** single item shape:
```json
{
  "id": "uuid",
  "title": "My Note",
  "content": "Some content...",
  "category": { "id": "uuid", "name": "School", "color": "#F5E6C8" },
  "last_edited_at": "2026-04-06T14:32:00Z",
  "created_at": "2026-04-06T14:00:00Z"
}
```
`category` is `null` if unset. `note_count` is NOT present inside note's category object.

**POST /api/notes/** — send empty body `{}`. Returns created note with blank title/content/null category.

**PATCH /api/notes/<id>/** request (all fields optional):
```json
{ "title": "Updated", "content": "text", "category": "uuid-or-null" }
```
`category` field: send UUID string to set, `null` to unset. Never send a nested object.
`last_edited_at` is never sent by client — always set by `auto_now=True` server-side.
Response: full note object (same as GET single).

---

## Django Project Structure

```
backend/
├── manage.py
├── requirements.txt          # Django==5.0.4, DRF, simplejwt, django-cors-headers
├── db.sqlite3
├── config/
│   ├── settings.py           # CORS, REST_FRAMEWORK, SIMPLE_JWT config
│   ├── urls.py               # mounts /api/auth/ and /api/
│   └── wsgi.py
└── apps/
    ├── accounts/
    │   ├── models.py         # empty — uses built-in User
    │   ├── serializers.py    # SignupSerializer (creates user + 3 categories, returns tokens)
    │   ├── views.py          # SignupView(CreateAPIView), LoginView(TokenObtainPairView wrapper)
    │   └── urls.py
    └── notes/
        ├── models.py         # Category, Note
        ├── serializers.py    # CategorySerializer, NoteSerializer (read), NoteWriteSerializer (write)
        ├── views.py          # CategoryListView(ListAPIView), NoteViewSet(ModelViewSet)
        └── urls.py
```

Key `settings.py`:
```python
CORS_ALLOWED_ORIGINS = ['http://localhost:3000']
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
}
SIMPLE_JWT = { 'ACCESS_TOKEN_LIFETIME': timedelta(hours=1), 'REFRESH_TOKEN_LIFETIME': timedelta(days=7) }
```

Two-serializer pattern in `NoteViewSet`:
- `get_serializer_class` returns `NoteWriteSerializer` for `create`/`partial_update` (category as UUID FK)
- returns `NoteSerializer` for `list`/`retrieve` (category as nested object)

---

## Frontend Project Structure

```
frontend/
├── package.json              # next, react, typescript, tailwindcss
├── tailwind.config.ts        # custom colors: bg=#F5F1ED, cat-random/school/personal
├── public/
│   ├── panda-sleeping.svg    # auth screen mascot
│   └── coffee-cup-happy.svg  # empty state mascot
└── src/
    ├── app/
    │   ├── layout.tsx            # root layout, wraps with <AuthProvider>
    │   ├── page.tsx              # redirects to /notes or /auth/login
    │   ├── auth/
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   └── notes/
    │       └── page.tsx          # main notes page
    ├── components/
    │   ├── auth/
    │   │   ├── LoginForm.tsx     # props: onSuccess(AuthResponse), onGoSignup()
    │   │   └── SignupForm.tsx    # props: onSuccess(AuthResponse), onGoLogin()
    │   └── notes/
    │       ├── Sidebar.tsx           # props: categories, activeCategoryId, onSelectCategory
    │       ├── SidebarCategoryItem.tsx
    │       ├── NoteGrid.tsx          # props: notes, onSelectNote(note)
    │       ├── NoteCard.tsx          # props: note, onClick
    │       ├── EmptyState.tsx        # static illustration
    │       └── NoteEditor.tsx        # props: note, categories, onClose, onNoteUpdated(note)
    ├── contexts/
    │   └── AuthContext.tsx       # user, isLoading, login(response), logout()
    ├── hooks/
    │   ├── useAutoSave.ts        # debounced PATCH, 500ms
    │   ├── useNotes.ts           # notes[], createNote(), deleteNote(), refresh()
    │   └── useCategories.ts      # categories[]
    ├── lib/
    │   ├── api.ts                # all API calls (see interface below)
    │   └── formatDate.ts         # formatNoteDate: "Today" | "Yesterday" | "Jan 15"
    └── types/
        └── index.ts              # all shared TypeScript types
```

**Tailwind custom config:**
```typescript
colors: {
  bg: '#F5F1ED',
  'cat-random':   '#E8B4A8',
  'cat-school':   '#F5E6C8',
  'cat-personal': '#B8D9D1',
},
fontFamily: { serif: ['Georgia', 'serif'] }
```

---

## Shared TypeScript Types (`src/types/index.ts`)

```typescript
export interface Category {
  id: string;
  name: string;
  color: string;
  note_count?: number;  // only present on GET /api/categories/
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: Category | null;
  last_edited_at: string;  // ISO 8601
  created_at: string;
}

export interface NoteUpdatePayload {
  title?:    string;
  content?:  string;
  category?: string | null;  // UUID string or null
}

export interface AuthResponse {
  access:  string;
  refresh: string;
  user: { id: number; email: string };
}
```

---

## Frontend API Client Interface (`src/lib/api.ts`)

```typescript
// Auth (no token needed)
export async function signup(email: string, password: string): Promise<AuthResponse>
export async function login(email: string, password: string): Promise<AuthResponse>

// Protected (reads Bearer token from localStorage)
export async function getCategories(): Promise<Category[]>
export async function getNotes(categoryId?: string): Promise<Note[]>
export async function createNote(): Promise<Note>
export async function getNote(id: string): Promise<Note>
export async function updateNote(id: string, payload: NoteUpdatePayload): Promise<Note>
export async function deleteNote(id: string): Promise<void>
```

Internal `request` helper reads `localStorage.getItem('access_token')` and attaches `Authorization: Bearer <token>`.

---

## Authentication Flow

- On login/signup success: store `access_token`, `refresh_token`, `user` in `localStorage`
- `AuthContext` reads from `localStorage` on mount; provides `user` to tree
- `<AuthGuard>` client component wraps the `/notes` route — redirects to `/auth/login` if no token
- No token refresh flow (demo app) — expired token redirects to login
- Logout: clear `localStorage`, redirect to `/auth/login`

---

## Auto-Save Implementation

```typescript
// hooks/useAutoSave.ts
function useAutoSave(noteId: string, field: keyof NoteUpdatePayload) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((value: string | null) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => updateNote(noteId, { [field]: value }), 500);
  }, [noteId, field]);
}
```

- Title/content: debounced 500ms on `onChange`
- Category: immediate PATCH on dropdown select
- `last_edited_at` shown in editor updates optimistically from PATCH response (no full refetch)
- After any save, `NotesPage` re-sorts `notes[]` by `last_edited_at` descending

---

## Integration Gotchas (Exact Agreement Points)

1. **PATCH category field**: send UUID string `"category": "abc-123"`, or `null` to unset. Never a nested object.
2. **GET category in note**: always nested `{ id, name, color }` or `null`. Never a bare UUID.
3. **`last_edited_at` is read-only**: never sent in requests. `auto_now=True` handles it.
4. **POST /api/notes/ body**: empty `{}`. Server returns note with blank fields, no category.
5. **`note_count`**: only in `GET /api/categories/` response, never in the `category` object inside a note.
6. **Auth header**: exactly `Authorization: Bearer <token>` (capital B, space, token).
7. **CORS**: `http://localhost:3000` (no trailing slash) in `CORS_ALLOWED_ORIGINS`.
8. **Error shape**: DRF returns `{ field: [string[]] }`. Frontend: `Object.values(err).flat().join(' ')`.
9. **UUID keys**: Category and Note `id` are UUID strings. User `id` is integer.
10. **Ordering**: notes always newest-first; frontend re-sorts after PATCH without full refetch.

---

## Build Instructions for Agents

### Backend Agent
Working directory: `/home/kanon/code/turboai/backend/`

Build in this order:
1. `django-admin startproject config .`; create `apps/accounts/` and `apps/notes/` apps
2. Install requirements: `Django==5.0.4 djangorestframework==3.15.1 djangorestframework-simplejwt==5.3.1 django-cors-headers==4.3.1`
3. Configure `settings.py` (CORS, JWT, DRF, INSTALLED_APPS)
4. Define models (`Category`, `Note`) and run migrations
5. Build `SignupSerializer` with default category creation
6. Build `LoginView` (simplejwt wrapper that also returns `user`)
7. Build `CategoryListView` with `note_count` annotation
8. Build `NoteViewSet` with two serializers (read vs write)
9. Wire up all URLs
10. Test with `curl` or browsable API

### Frontend Agent
Working directory: `/home/kanon/code/turboai/frontend/`

Build in this order:
1. `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir` (then move to `src/`)
   Actually: `npx create-next-app@latest . --typescript --tailwind --app --src-dir`
2. Define `src/types/index.ts` first (all types)
3. Build `src/lib/api.ts` (all API functions with the `request` helper)
4. Build `src/lib/formatDate.ts`
5. Build `AuthContext` and `useAutoSave`, `useNotes`, `useCategories` hooks
6. Build auth components: `LoginForm`, `SignupForm`
7. Build notes components: `Sidebar`, `NoteCard`, `NoteGrid`, `EmptyState`, `NoteEditor`
8. Build pages: `/auth/login`, `/auth/signup`, `/notes`, `/` (redirect)
9. Add placeholder SVG mascots in `public/` if real ones not available

---

## Verification

After both agents finish:
1. Start backend: `cd backend && python manage.py runserver 8000`
2. Start frontend: `cd frontend && npm run dev`
3. Test: signup → empty state shows → create note → type → auto-save works → category change changes color → close note → card shows in grid → filter by category works → login/logout cycle works
