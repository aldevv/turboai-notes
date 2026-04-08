/**
 * Tests for src/lib/api.ts
 *
 * Mocks global fetch to verify request construction, auth headers,
 * token refresh flow, and error handling.
 */

// Must mock localStorage and location before importing the module so the
// module-level closures pick up the mocked versions.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    _store: () => store,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// jsdom's window.location is non-configurable; delete it first then replace with a
// simple writable mock so clearAuth() doesn't trigger a real navigation.
delete (window as any).location;
(window as any).location = { href: '' };

// Reset module-level refresh state between tests
beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
  // Re-import resets module-level variables; easier to just reset via jest.resetModules
  jest.resetModules();
});

describe('api helpers', () => {
  function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
    const responseHeaders = new Map<string, string>(
      Object.entries({ 'content-type': 'application/json', ...headers }),
    );
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      status,
      ok: status >= 200 && status < 300,
      headers: { get: (k: string) => responseHeaders.get(k) ?? null },
      json: jest.fn().mockResolvedValue(body),
    });
  }

  function mockFetch204() {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      status: 204,
      ok: true,
      headers: { get: () => null },
      json: jest.fn(),
    });
  }

  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  describe('login', () => {
    it('sends POST /auth/login/ with email and password', async () => {
      const { login } = await import('@/lib/api');
      mockFetch(200, {
        access: 'acc',
        refresh: 'ref',
        user: { id: 1, email: 'a@b.com' },
      });

      await login('a@b.com', 'pw');

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toMatch('/auth/login/');
      expect(options.method).toBe('POST');
      const parsed = JSON.parse(options.body as string);
      expect(parsed).toEqual({ email: 'a@b.com', password: 'pw' });
    });

    it('does not include Authorization header when no token in localStorage', async () => {
      const { login } = await import('@/lib/api');
      mockFetch(200, {
        access: 'acc',
        refresh: 'ref',
        user: { id: 1, email: 'a@b.com' },
      });

      await login('a@b.com', 'pw');

      const [, options] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('includes Authorization header when access_token exists', async () => {
      localStorageMock.setItem('access_token', 'mytoken');
      const { login } = await import('@/lib/api');
      mockFetch(200, {
        access: 'acc',
        refresh: 'ref',
        user: { id: 1, email: 'a@b.com' },
      });

      await login('a@b.com', 'pw');

      const [, options] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer mytoken');
    });

    it('returns the response body', async () => {
      const { login } = await import('@/lib/api');
      const responseData = {
        access: 'acc',
        refresh: 'ref',
        user: { id: 1, email: 'a@b.com' },
      };
      mockFetch(200, responseData);

      const result = await login('a@b.com', 'pw');
      expect(result).toEqual(responseData);
    });

    it('throws the JSON error body on non-401 failure', async () => {
      const { login } = await import('@/lib/api');
      mockFetch(400, { detail: 'Invalid credentials' });

      await expect(login('a@b.com', 'bad')).rejects.toEqual({
        detail: 'Invalid credentials',
      });
    });

    it('throws a plain error object when response is not JSON on failure', async () => {
      const { login } = await import('@/lib/api');
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        status: 500,
        ok: false,
        statusText: 'Internal Server Error',
        headers: { get: () => 'text/html' },
        json: jest.fn(),
      });

      await expect(login('a@b.com', 'pw')).rejects.toEqual({
        detail: 'Server error: 500 Internal Server Error',
      });
    });
  });

  // -------------------------------------------------------------------------
  // signup
  // -------------------------------------------------------------------------

  describe('signup', () => {
    it('sends POST /auth/signup/', async () => {
      const { signup } = await import('@/lib/api');
      mockFetch(200, {
        access: 'acc',
        refresh: 'ref',
        user: { id: 2, email: 'new@b.com' },
      });

      await signup('new@b.com', 'secret');

      const [url, options] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toMatch('/auth/signup/');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body as string)).toEqual({
        email: 'new@b.com',
        password: 'secret',
      });
    });
  });

  // -------------------------------------------------------------------------
  // getCategories
  // -------------------------------------------------------------------------

  describe('getCategories', () => {
    it('sends GET /categories/', async () => {
      const { getCategories } = await import('@/lib/api');
      mockFetch(200, [{ id: '1', name: 'Work', color: '#aaa' }]);

      await getCategories();

      const [url, options] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toMatch('/categories/');
      expect(options.method).toBe('GET');
    });

    it('returns the categories array', async () => {
      const { getCategories } = await import('@/lib/api');
      const data = [{ id: '1', name: 'Work', color: '#aaa', note_count: 3 }];
      mockFetch(200, data);

      const result = await getCategories();
      expect(result).toEqual(data);
    });
  });

  // -------------------------------------------------------------------------
  // getNotes
  // -------------------------------------------------------------------------

  describe('getNotes', () => {
    it('sends GET /notes/ with no params', async () => {
      const { getNotes } = await import('@/lib/api');
      mockFetch(200, { count: 0, next: null, previous: null, results: [] });

      await getNotes();

      const [url] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toMatch('/notes/');
      expect(url).not.toMatch('?');
    });

    it('appends category query param when categoryId provided', async () => {
      const { getNotes } = await import('@/lib/api');
      mockFetch(200, { count: 0, next: null, previous: null, results: [] });

      await getNotes({ categoryId: 'abc123' });

      const [url] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toMatch('category=abc123');
    });

    it('appends page query param when page > 1', async () => {
      const { getNotes } = await import('@/lib/api');
      mockFetch(200, { count: 0, next: null, previous: null, results: [] });

      await getNotes({ page: 2 });

      const [url] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toMatch('page=2');
    });

    it('does not append page=1 to the URL', async () => {
      const { getNotes } = await import('@/lib/api');
      mockFetch(200, { count: 0, next: null, previous: null, results: [] });

      await getNotes({ page: 1 });

      const [url] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).not.toMatch('page=');
    });
  });

  // -------------------------------------------------------------------------
  // createNote
  // -------------------------------------------------------------------------

  describe('createNote', () => {
    it('sends POST /notes/ with the payload', async () => {
      const { createNote } = await import('@/lib/api');
      const newNote = {
        id: '1',
        title: 'New Note',
        content: '',
        category: null,
        last_edited_at: '',
        created_at: '',
      };
      mockFetch(200, newNote);

      await createNote({ title: 'New Note' });

      const [url, options] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toMatch('/notes/');
      expect(options.method).toBe('POST');
    });

    it('sends an empty object when called with no payload', async () => {
      const { createNote } = await import('@/lib/api');
      const newNote = {
        id: '1',
        title: '',
        content: '',
        category: null,
        last_edited_at: '',
        created_at: '',
      };
      mockFetch(200, newNote);

      await createNote();

      const [, options] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(options.body as string)).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // updateNote
  // -------------------------------------------------------------------------

  describe('updateNote', () => {
    it('sends PATCH /notes/:id/', async () => {
      const { updateNote } = await import('@/lib/api');
      const updated = {
        id: 'abc',
        title: 'Hello',
        content: 'World',
        category: null,
        last_edited_at: '',
        created_at: '',
      };
      mockFetch(200, updated);

      await updateNote('abc', { title: 'Hello' });

      const [url, options] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toMatch('/notes/abc/');
      expect(options.method).toBe('PATCH');
    });
  });

  // -------------------------------------------------------------------------
  // deleteNote
  // -------------------------------------------------------------------------

  describe('deleteNote', () => {
    it('sends DELETE /notes/:id/ and returns undefined on 204', async () => {
      const { deleteNote } = await import('@/lib/api');
      mockFetch204();

      const result = await deleteNote('abc');

      const [url, options] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toMatch('/notes/abc/');
      expect(options.method).toBe('DELETE');
      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 401 token refresh flow
  // -------------------------------------------------------------------------

  describe('401 token refresh', () => {
    it('clears auth and throws when no refresh token is present', async () => {
      // no tokens in storage
      const { getCategories } = await import('@/lib/api');

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        status: 401,
        ok: false,
        headers: { get: () => 'application/json' },
        json: jest.fn().mockResolvedValue({ detail: 'Unauthorized' }),
      });

      await expect(getCategories()).rejects.toThrow('Session expired');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
    });

    it('refreshes the access token and retries the original request', async () => {
      localStorageMock.setItem('access_token', 'old-access');
      localStorageMock.setItem('refresh_token', 'valid-refresh');

      const { getCategories } = await import('@/lib/api');

      // First call returns 401
      (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
          headers: { get: () => 'application/json' },
          json: jest.fn().mockResolvedValue({ detail: 'Unauthorized' }),
        })
        // Refresh call returns new access token
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          headers: { get: () => 'application/json' },
          json: jest.fn().mockResolvedValue({ access: 'new-access' }),
        })
        // Retry of original call succeeds
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          headers: { get: () => 'application/json' },
          json: jest.fn().mockResolvedValue([{ id: '1', name: 'Work', color: '#aaa' }]),
        });

      const result = await getCategories();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'new-access');
      expect(result).toEqual([{ id: '1', name: 'Work', color: '#aaa' }]);
    });

    it('clears auth and throws when the refresh request fails', async () => {
      localStorageMock.setItem('access_token', 'old-access');
      localStorageMock.setItem('refresh_token', 'bad-refresh');

      const { getCategories } = await import('@/lib/api');

      (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
          headers: { get: () => 'application/json' },
          json: jest.fn().mockResolvedValue({}),
        })
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
          headers: { get: () => 'application/json' },
          json: jest.fn().mockResolvedValue({}),
        });

      await expect(getCategories()).rejects.toThrow('Session expired');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
    });
  });
});
