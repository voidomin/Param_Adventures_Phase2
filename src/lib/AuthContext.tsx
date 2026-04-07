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
  gender?: string | null;
  age?: number | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactNumber?: string | null;
  emergencyRelationship?: string | null;
  isVerified: boolean;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  mutateUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ────────────────────────────────────────────

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the current user on mount
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return data.user as User;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
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
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          throw new Error(data.error || "Login failed.");
        } else {
          const text = await res.text();
          console.error("Non-JSON Error Response:", text.substring(0, 500));
          throw new Error(`Server returned ${res.status} ${res.statusText}. Check server logs.`);
        }
      }

      // Cookie is set by the API response — refetch user
      const userData = await fetchUser();
      if (!userData) throw new Error("Could not retrieve user session.");
      return userData;
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
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          throw new Error(data.error || "Registration failed.");
        } else {
          throw new Error(`Server returned ${res.status} ${res.statusText} during registration. Check server logs.`);
        }
      }

      const userData = await fetchUser();
      if (!userData) throw new Error("Could not retrieve user session after registration.");
      return userData;
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
