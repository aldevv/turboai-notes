import { AuthResponse, Category, Note, NoteUpdatePayload } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!refreshToken) {
      clearAuth();
      throw new Error('Session expired');
    }

    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push(() => {
          request<T>(method, path, body).then(resolve).catch(reject);
        });
      });
    }

    isRefreshing = true;
    try {
      const r = await fetch(`${API_BASE}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!r.ok) {
        isRefreshing = false;
        clearAuth();
        throw new Error('Session expired');
      }
      const { access } = await r.json() as { access: string };
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access);
      }
      isRefreshing = false;
      refreshQueue.forEach(cb => cb(access));
      refreshQueue = [];
      return request<T>(method, path, body);
    } catch {
      isRefreshing = false;
      clearAuth();
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const ct = res.headers.get('content-type') ?? '';
    const errorBody = ct.includes('application/json')
      ? await res.json()
      : { detail: `Server error: ${res.status} ${res.statusText}` };
    throw errorBody;
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const signup = (email: string, password: string) =>
  request<AuthResponse>('POST', '/auth/signup/', { email, password });

export const login = (email: string, password: string) =>
  request<AuthResponse>('POST', '/auth/login/', { email, password });

export const getCategories = () => request<Category[]>('GET', '/categories/');

export const getNotes = (categoryId?: string) =>
  request<Paginated<Note>>('GET', `/notes/${categoryId ? `?category=${categoryId}` : ''}`)
    .then(r => r.results);

export const createNote = () => request<Note>('POST', '/notes/', {});

export const getNote = (id: string) => request<Note>('GET', `/notes/${id}/`);

export const updateNote = (id: string, payload: NoteUpdatePayload) =>
  request<Note>('PATCH', `/notes/${id}/`, payload);

export const deleteNote = (id: string) => request<void>('DELETE', `/notes/${id}/`);
