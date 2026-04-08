/**
 * Tests for src/contexts/AuthContext.tsx
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AuthResponse } from '@/types';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Build a minimal valid JWT where the payload contains user_id */
function makeJwt(userId: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ user_id: userId, exp: 9999999999 }));
  return `${header}.${payload}.signature`;
}

const mockAuthResponse: AuthResponse = {
  access: makeJwt(42),
  refresh: 'refresh-token',
  user: { id: 42, email: 'user@test.com' },
};

// Component that exposes auth state via accessible text for assertions
function TestConsumer() {
  const { user, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user-email">{user?.email ?? 'none'}</span>
      <span data-testid="user-id">{user?.id ?? 'none'}</span>
      <button onClick={() => login(mockAuthResponse)}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// ------------------------------------------------------------------
// localStorage mock
// ------------------------------------------------------------------

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

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('AuthProvider', () => {
  describe('initial state from localStorage', () => {
    it('starts with isLoading=true then resolves to logged-out when no token', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      // After mount the effect runs synchronously in jsdom
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    });

    it('restores user from a valid access_token + user_email in localStorage', () => {
      localStorageMock.setItem('access_token', makeJwt(7));
      localStorageMock.setItem('user_email', 'restored@test.com');

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId('user-id')).toHaveTextContent('7');
      expect(screen.getByTestId('user-email')).toHaveTextContent('restored@test.com');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    it('clears storage and treats user as logged-out when token is malformed', () => {
      localStorageMock.setItem('access_token', 'not.a.jwt');
      localStorageMock.setItem('refresh_token', 'r');
      localStorageMock.setItem('user_email', 'x@y.com');

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_email');
    });
  });

  describe('login()', () => {
    it('sets user state with id and email from the response', async () => {
      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await user.click(screen.getByText('Login'));

      expect(screen.getByTestId('user-email')).toHaveTextContent('user@test.com');
      expect(screen.getByTestId('user-id')).toHaveTextContent('42');
    });

    it('stores access_token, refresh_token, and user_email in localStorage', async () => {
      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await user.click(screen.getByText('Login'));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'access_token',
        mockAuthResponse.access,
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'refresh_token',
        mockAuthResponse.refresh,
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user_email',
        mockAuthResponse.user.email,
      );
    });
  });

  describe('logout()', () => {
    it('clears user state', async () => {
      const user = userEvent.setup();
      localStorageMock.setItem('access_token', makeJwt(42));
      localStorageMock.setItem('user_email', 'user@test.com');

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      // log in first, then out
      await user.click(screen.getByText('Login'));
      await user.click(screen.getByText('Logout'));

      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    });

    it('removes all auth keys from localStorage', async () => {
      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await user.click(screen.getByText('Login'));
      await user.click(screen.getByText('Logout'));

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_email');
    });
  });
});
