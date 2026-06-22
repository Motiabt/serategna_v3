import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, tokens } from './api';

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  name: string;
  language: string;
  roles: { worker: boolean; client: boolean; agent: boolean; admin: boolean };
  adminRole: string | null;
  tier: number;
  faydaStatus: string;
  accountType?: string;
}

export type Mode = 'client' | 'worker';

interface AuthValue {
  user: User | null;
  loading: boolean;
  mode: Mode;
  setMode: (m: Mode) => void;
  refreshUser: () => Promise<void>;
  setSession: (user: User, access: string, refresh: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setModeState] = useState<Mode>((localStorage.getItem('srt_mode') as Mode) || 'client');

  const setMode = (m: Mode) => {
    setModeState(m);
    localStorage.setItem('srt_mode', m);
  };

  const refreshUser = useCallback(async () => {
    if (!tokens.access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<{ user: User }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
      tokens.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const setSession = (u: User, access: string, refresh: string) => {
    tokens.set(access, refresh);
    setUser(u);
    if (u.roles.admin) setMode('client');
    else setMode(u.roles.worker ? 'worker' : 'client');
  };

  const logout = () => {
    api.post('/api/auth/logout', { refreshToken: tokens.refresh }).catch(() => undefined);
    tokens.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, mode, setMode, refreshUser, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
