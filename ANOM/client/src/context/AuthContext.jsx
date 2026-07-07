/**
 * src/context/AuthContext.jsx
 *
 * Provides { user, token, authLogin, authLogout } to the whole tree.
 * JWT is persisted in localStorage under the key "anom_token".
 * The decoded user object is stored in localStorage as "anom_user".
 */

import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'anom_token';
const USER_KEY  = 'anom_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user,  setUser]  = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  /** Called after a successful signup or login response. */
  function authLogin(responseToken, responseUser) {
    localStorage.setItem(TOKEN_KEY, responseToken);
    localStorage.setItem(USER_KEY, JSON.stringify(responseUser));
    setToken(responseToken);
    setUser(responseUser);
  }

  /** Clears session from memory and localStorage. */
  function authLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, authLogin, authLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook — throws if used outside <AuthProvider>. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
