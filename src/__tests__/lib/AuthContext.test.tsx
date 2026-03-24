import { render, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import React from "react";

// Helper component to test useAuth hook
const TestComponent = () => {
  const { user, isLoading, login, register, logout, hasPermission } = useAuth();
  if (isLoading) return <div data-testid="loading">Loading...</div>;
  if (!user) return (
    <div>
      <div data-testid="guest">Guest</div>
      <button onClick={() => login("test@test.com", "pass")}>Login</button>
      <button onClick={() => register("test@test.com", "pass", "Test User")}>Register</button>
    </div>
  );
  return (
    <div>
      <div data-testid="user">{user.name}</div>
      <div data-testid="role">{user.role}</div>
      <div data-testid="permission">{hasPermission("test-perm") ? "Yes" : "No"}</div>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  it("fetches user on mount and handles loading state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "1", name: "Test User", role: "USER", permissions: [] } }),
    } as Response);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId("loading")).toBeDefined();

    await waitFor(() => {
      expect(getByTestId("user")).toHaveTextContent("Test User");
    });
  });

  it("handles guest state when /api/auth/me fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId("guest")).toBeDefined();
    });
  });

  it("handles login successfully", async () => {
    // Initial fetch (guest)
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    
    // Login fetch
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    
    // Fetch user after login
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "1", name: "Logged In", role: "USER", permissions: [] } }),
    } as Response);

    const { getByTestId, getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId("guest")).toBeDefined());

    await act(async () => {
      getByText("Login").click();
    });

    await waitFor(() => {
      expect(getByTestId("user")).toHaveTextContent("Logged In");
    });
  });

  it("handles logout successfully", async () => {
    // Initial fetch (logged in)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "1", name: "Test User", role: "USER", permissions: [] } }),
    } as Response);
    
    // Logout fetch
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    const { getByTestId, getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId("user")).toBeDefined());

    await act(async () => {
      getByText("Logout").click();
    });

    await waitFor(() => {
      expect(getByTestId("guest")).toBeDefined();
    });
  });

  it("correctly evaluates permissions", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        user: { 
          id: "1", 
          name: "Perm User", 
          role: "ADMIN", 
          permissions: ["test-perm"] 
        } 
      }),
    } as Response);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId("permission")).toHaveTextContent("Yes");
    });
  });
});
