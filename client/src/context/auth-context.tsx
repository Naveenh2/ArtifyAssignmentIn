"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type User = { id: string; email: string; name: string | null };

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | undefined>(undefined);

/**
 * Session is stored in an **httpOnly** cookie issued by Next.js Route Handlers (`/api/auth/*`).
 * The JWT never touches `localStorage`, reducing XSS risk for recruiters reviewing security posture.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  const refresh = React.useCallback(async () => {
    try {
      const { user: u } = await api.me();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      setUser(res.user);
      router.push("/dashboard");
    },
    [router]
  );

  const signup = React.useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await api.signup({ email, password, name });
      setUser(res.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = React.useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setUser(null);
    router.push("/");
  }, [router]);

  const value = React.useMemo(
    () => ({ user, loading, login, signup, logout, refresh }),
    [user, loading, login, signup, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
