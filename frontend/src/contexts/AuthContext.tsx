'use client';

import { createContext, useContext, useState } from 'react';
import { AuthResponse, AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (response: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: false,
  login: () => {},
  logout: () => {},
});

function readUserFromStorage(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as {
      user_id: number;
    };
    // simplejwt embeds user_id; email is persisted separately at login
    return { id: payload.user_id, email: localStorage.getItem('user_email') ?? '' };
  } catch {
    // Malformed token — treat as logged out
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_email');
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readUserFromStorage);

  function login(response: AuthResponse) {
    localStorage.setItem('access_token', response.access);
    localStorage.setItem('refresh_token', response.refresh);
    localStorage.setItem('user_email', response.user.email);
    setUser(response.user);
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_email');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
