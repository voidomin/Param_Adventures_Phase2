"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

// ─── Types ───────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  isVerified: boolean;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  mutateUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Helper: get cookie value ────────────────────────────

function getCookie(name: string): string | undefined {
  const match = new RegExp(`(^| )${name}=([^;]+)`).exec(document.cookie);
  return match ? match[2] : undefined;
}

// ─── Provider ────────────────────────────────────────────

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the current user on mount
  const fetchUser = useCallback(async () => {
    const token = getCookie("accessToken");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // ─── Login ───────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed.");
      }

      // Cookie is set by the API response — refetch user
      await fetchUser();
    },
    [fetchUser],
  );

  // ─── Register ────────────────────────────────────────
  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed.");
      }

      await fetchUser();
    },
    [fetchUser],
  );

  // ─── Logout ──────────────────────────────────────────
  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  // ─── Permission check ───────────────────────────────
  const hasPermission = useCallback(
    (key: string) => {
      return user?.permissions?.includes(key) ?? false;
    },
    [user],
  );

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      hasPermission,
      mutateUser: fetchUser,
    }),
    [user, isLoading, login, register, logout, hasPermission, fetchUser],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
