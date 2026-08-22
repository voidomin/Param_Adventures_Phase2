"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { installSessionWatchdog } from "@/lib/session-watchdog";

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
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactNumber?: string | null;
  emergencyRelationship?: string | null;
  bio?: string | null;
  certifications?: string[];
  isVerified: boolean;
  twoFactorEnabled: boolean;
  permissions: string[];
}

export type LoginResult = User | { requiresTwoFactor: true };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<LoginResult>;
  loginWithGoogle: (credential: string, totpCode?: string) => Promise<LoginResult>;
  register: (email: string, password: string, name: string, acceptedTerms: boolean, turnstileToken?: string) => Promise<User>;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  mutateUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Shared response handling for /api/auth/login and /api/auth/google: both
 * can either fail outright, succeed (cookies set, no body flag), or come
 * back 200 with { requiresTwoFactor: true } when the account has 2FA
 * enabled and no code was supplied yet.
 */
async function parseAuthResponse(
  res: Response,
  defaultErrorMessage: string,
): Promise<{ requiresTwoFactor?: boolean; error?: string }> {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    if (isJson) {
      const data = await res.json();
      throw new Error(data.error || defaultErrorMessage);
    }
    const text = await res.text();
    console.error("Non-JSON Error Response:", text.substring(0, 500));
    throw new Error(`Server returned ${res.status} ${res.statusText}. Check server logs.`);
  }

  return isJson ? res.json() : {};
}

// ─── Provider ────────────────────────────────────────────

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

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

  // Global safety net: if any API call anywhere in the app comes back
  // reporting the session is no longer valid (expired/revoked token,
  // deactivated account), log out cleanly and redirect instead of leaving
  // the current page showing stale data until the next click surfaces a
  // raw error.
  useEffect(() => {
    const uninstall = installSessionWatchdog(() => {
      setUser(null);
      const current = pathnameRef.current;
      if (current && !current.startsWith("/login")) {
        router.push(`/login?redirect=${encodeURIComponent(current)}&reason=session-expired`);
      }
    });
    return uninstall;
  }, [router]);

  // ─── Login ───────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string, totpCode?: string): Promise<LoginResult> => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totpCode }),
      });

      const data = await parseAuthResponse(res, "Login failed.");
      if (data.requiresTwoFactor) return { requiresTwoFactor: true };

      // Cookie is set by the API response — refetch user
      const userData = await fetchUser();
      if (!userData) throw new Error("Could not retrieve user session.");
      return userData;
    },
    [fetchUser],
  );

  // ─── Login with Google ───────────────────────────────
  const loginWithGoogle = useCallback(
    async (credential: string, totpCode?: string): Promise<LoginResult> => {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, totpCode }),
      });

      const data = await parseAuthResponse(res, "Google sign-in failed.");
      if (data.requiresTwoFactor) return { requiresTwoFactor: true };

      const userData = await fetchUser();
      if (!userData) throw new Error("Could not retrieve user session.");
      return userData;
    },
    [fetchUser],
  );

  // ─── Register ────────────────────────────────────────
  const register = useCallback(
    async (email: string, password: string, name: string, acceptedTerms: boolean, turnstileToken?: string) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, acceptedTerms, turnstileToken }),
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
      loginWithGoogle,
      register,
      logout,
      hasPermission,
      mutateUser: fetchUser,
    }),
    [user, isLoading, login, loginWithGoogle, register, logout, hasPermission, fetchUser],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (process.env.NODE_ENV === "development") {
      console.warn("useAuth was called outside of an AuthProvider. Returning fallback logged-out context.");
    }
    return {
      user: null,
      isLoading: true,
      login: async () => { throw new Error("Auth not initialized"); },
      loginWithGoogle: async () => { throw new Error("Auth not initialized"); },
      register: async () => { throw new Error("Auth not initialized"); },
      logout: async () => {},
      hasPermission: () => false,
      mutateUser: async () => null,
    };
  }
  return ctx;
}
