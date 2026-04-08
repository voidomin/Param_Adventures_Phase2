import { render, waitFor, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import React from "react";

// Mock child component for testing the hook
const AuthTestComponent = () => {
  const { user, login, register, logout } = useAuth();
  return (
    <div>
      <div data-testid="state">{user ? user.role : "guest"}</div>
      <button onClick={() => login("test@example.com", "password").catch(err => {
        document.getElementById("error-msg")!.textContent = err.message;
      })}>Login</button>
      <button onClick={() => register("test@example.com", "password", "Test User").catch(err => {
        document.getElementById("error-msg")!.textContent = err.message;
      })}>Register</button>
      <button onClick={() => logout()}>Logout</button>
      <div id="error-msg" data-testid="error" />
    </div>
  );
};

// Mock fetch helpers
const mockResponse = (ok: boolean, data: any, status = 200) => ({
  ok,
  status,
  statusText: ok ? "OK" : "Error",
  headers: {
    get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
  },
  json: async () => data,
  text: async () => JSON.stringify(data),
});

describe("AuthContext", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Mock document.cookie
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });

  it("fetches user on mount", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(true, { 
      user: { id: "1", email: "test@example.com", role: "admin", permissions: [] } 
    }));

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("admin");
    });
  });

  it("sets user to null if fetch fails on mount", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(false, {}, 401));

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("guest");
    });
  });

  it("handles login successfully", async () => {
    // 1. Initial fetch (guest)
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(false, {}, 401));
    // 2. Login call
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(true, { success: true }));
    // 3. Post-login fetch (admin)
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(true, { 
      user: { id: "1", email: "test@example.com", role: "admin", permissions: [] } 
    }));

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("admin");
    });
  });

  it("handles login failure and throws error with server message", async () => {
    // 1. Initial fetch (guest)
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(false, {}, 401));
    // 2. Login call (fail)
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(false, { error: "Invalid credentials" }, 401));

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Invalid credentials");
    });
  });

  it("handles registration successfully", async () => {
    // 1. Initial fetch (guest)
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(false, {}, 401));
    // 2. Register call
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(true, { success: true }));
    // 3. Post-register fetch (user)
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(true, { 
      user: { id: "2", email: "test@example.com", role: "user", permissions: [] } 
    }));

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText("Register"));

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("user");
    });
  });

  it("handles register failure and throws error with server message", async () => {
    // 1. Initial fetch (guest)
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(false, {}, 401));
    // 2. Register call (fail)
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(false, { error: "Email already exists" }, 400));

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText("Register"));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Email already exists");
    });
  });

  it("handles logout successfully", async () => {
    // 1. Initial fetch (admin)
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(true, { 
      user: { id: "1", email: "test@example.com", role: "admin", permissions: [] } 
    }));
    // 2. Logout call
    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse(true, { success: true }));

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("admin");
    });

    fireEvent.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("guest");
    });
  });
});
