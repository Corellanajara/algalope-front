import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('algalope_user');
    const token = localStorage.getItem('algalope_token');
    if (!stored || !token) {
      setLoading(false);
      return;
    }
    // Validate token against backend on mount — prevents stale tokens from
    // silently failing every query after a DB reset or backend change.
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('algalope_token');
        localStorage.removeItem('algalope_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('algalope_token', data.token);
    localStorage.setItem('algalope_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function register(email: string, password: string, displayName: string) {
    const { data } = await api.post('/auth/register', { email, password, displayName });
    localStorage.setItem('algalope_token', data.token);
    localStorage.setItem('algalope_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('algalope_token');
    localStorage.removeItem('algalope_user');
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}
