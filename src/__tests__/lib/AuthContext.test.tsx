import { render, waitFor, act, fireEvent, screen } from "@testing-library/react";
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

  it("handles login failure and throws error with server message", async () => {
    // Initial fetch (guest)
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    
    // Login fails with error message
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    } as Response);

    const LoginErrorComponent = () => {
      const { user, isLoading, login } = useAuth();
      const [error, setError] = React.useState("");
      if (isLoading) return <div data-testid="loading">Loading...</div>;
      return (
        <div>
          <div data-testid="state">{user ? "logged-in" : "guest"}</div>
          {error && <div data-testid="error">{error}</div>}
          <button onClick={() => login("bad@test.com", "wrong").catch(e => setError(e.message))}>Login</button>
        </div>
      );
    };

    const { getByTestId, getByText } = render(
      <AuthProvider>
        <LoginErrorComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId("state")).toHaveTextContent("guest"));

    await act(async () => {
      getByText("Login").click();
    });

    await waitFor(() => {
      expect(getByTestId("error")).toHaveTextContent("Invalid credentials");
    });
  });

  it("handles register failure and throws error with server message", async () => {
    // Initial fetch (guest)
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    
    // Register fails
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Email already exists" }),
    } as Response);

    const RegisterErrorComponent = () => {
      const { user, isLoading, register } = useAuth();
      const [error, setError] = React.useState("");
      if (isLoading) return <div data-testid="loading">Loading...</div>;
      return (
        <div>
          <div data-testid="state">{user ? "logged-in" : "guest"}</div>
          {error && <div data-testid="error">{error}</div>}
          <button onClick={() => register("dup@test.com", "pass", "Dup User").catch(e => setError(e.message))}>Register</button>
        </div>
      );
    };

    const { getByTestId, getByText } = render(
      <AuthProvider>
        <RegisterErrorComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId("state")).toHaveTextContent("guest"));

    await act(async () => {
      getByText("Register").click();
    });

    await waitFor(() => {
      expect(getByTestId("error")).toHaveTextContent("Email already exists");
    });
  });

  it("handles network error during initial fetchUser gracefully", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network down"));

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId("guest")).toBeDefined();
    });
  });

  it("throws error when useAuth is used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const BadComponent = () => {
      useAuth();
      return <div>should not render</div>;
    };

    expect(() => render(<BadComponent />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );
    
    spy.mockRestore();
  });

  it("handles registration validation error (400)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Email already exists" }),
    } as Response);

    const TestComp = () => {
      const { register } = useAuth();
      return <button onClick={() => register("test@test.com", "pass", "Name").catch(() => {})}>Register</button>;
    };

    render(<AuthProvider><TestComp /></AuthProvider>);
    fireEvent.click(screen.getByText("Register"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/auth/register"), expect.anything());
    });
  });

  it("handles logout failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation((url: any) => {
      if (typeof url === 'string' && url.includes("/api/auth/logout")) {
        return Promise.resolve({ ok: false, json: async () => ({ error: "Logout failed" }) } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({ user: null }) } as Response);
    });

    const TestComp = () => {
      const { logout } = useAuth();
      return <button onClick={() => logout().catch(() => {})}>Logout</button>;
    };

    render(<AuthProvider><TestComp /></AuthProvider>);
    fireEvent.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/auth/logout"), expect.anything());
    });
  });
});
