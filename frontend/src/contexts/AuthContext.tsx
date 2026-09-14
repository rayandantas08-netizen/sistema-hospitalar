import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from '../api/auth';
import type { AuthUser, UserRole } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loginWithToken: (nextToken: string) => Promise<void>;
  logout: () => void;
  isAllowed: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hospitalar_token'));
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const profile = await getCurrentUser(token);
        setUser(profile);
      } catch {
        localStorage.removeItem('hospitalar_token');
        setToken(null);
        setUser(null);
      }
    };

    void loadProfile();
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    async loginWithToken(nextToken: string) {
      localStorage.setItem('hospitalar_token', nextToken);
      setToken(nextToken);
    },
    logout() {
      localStorage.removeItem('hospitalar_token');
      setToken(null);
      setUser(null);
    },
    isAllowed(role: UserRole) {
      return user?.papel === role || user?.papel === 'ADMINISTRADOR_PRINCIPAL';
    },
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
