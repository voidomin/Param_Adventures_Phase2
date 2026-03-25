import React, * as ReactModule from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AuthLayout from "@/components/auth/AuthLayout";

vi.mock("framer-motion", () => {
  const motion = new Proxy(
    {},
    {
      get: (_, tag: string) =>
        ({ children, ...props }: any) =>
          ReactModule.createElement(tag, props, children),
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => (
    <div
      data-testid="next-image"
      data-src={String(src)}
      aria-label={String(alt ?? "")}
    />
  ),
}));

vi.mock("@/components/auth/FloatingParticles", () => ({
  default: () => <div data-testid="floating-particles" />,
}));

vi.mock("@/components/auth/AestheticOverlays", () => ({
  FilmGrain: () => <div data-testid="film-grain" />,
  LightLeak: () => <div data-testid="light-leak" />,
}));

describe("AuthLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("renders fallback headings and performs shared fetches", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {} }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(
      <AuthLayout heading="Sign in" subheading="Welcome back">
        <div>Form body</div>
      </AuthLayout>,
    );

    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Form body")).toBeInTheDocument();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/settings/auth", {
        cache: "no-store",
      });
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/quotes", {
        cache: "no-store",
      });
    });
  });

  it("uses dynamic login settings, background video, and quote author", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: "https://example.com/video/upload/login.mp4" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            auth_common_tagline: "Explore Wild",
            auth_login_image_heading: "Login Hero",
            auth_login_image_subheading: "Login sub",
            auth_login_form_heading: "Custom Sign in",
            auth_login_form_subheading: "Custom welcome",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ quote: { text: "Adventure first", author: "Param" } }),
      });

    render(
      <AuthLayout
        heading="Sign in"
        subheading="Welcome"
        settingsKey="auth_login_bg"
      >
        <div>Form body</div>
      </AuthLayout>,
    );

    await waitFor(() => {
      expect(screen.getByText("Custom Sign in")).toBeInTheDocument();
      expect(screen.getByText("Custom welcome")).toBeInTheDocument();
      expect(screen.getByText("Explore Wild")).toBeInTheDocument();
      expect(screen.getByText("Login Hero")).toBeInTheDocument();
      expect(screen.getByText("Login sub")).toBeInTheDocument();
      expect(screen.getByText(/Adventure first/)).toBeInTheDocument();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/settings?key=auth_login_bg", {
      cache: "no-store",
    });
    expect(document.querySelector("video")).toBeInTheDocument();
  });

  it("supports register prefix values and compact mode", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            auth_register_form_heading: "Create account",
            auth_register_form_subheading: "Join us",
            auth_register_image_heading: "Register Hero",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ quote: { text: "No author quote", author: null } }),
      });

    const { container } = render(
      <AuthLayout
        heading="Register"
        subheading="Start your journey"
        settingsKey="auth_register_bg"
        compact
      >
        <div>Form body</div>
      </AuthLayout>,
    );

    await waitFor(() => {
      expect(screen.getByText("Create account")).toBeInTheDocument();
      expect(screen.getByText("Join us")).toBeInTheDocument();
      expect(screen.getByText("Register Hero")).toBeInTheDocument();
      expect(screen.getByText(/No author quote/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/—\s*Param/)).not.toBeInTheDocument();
    expect(container.querySelector(".py-4")).toBeInTheDocument();
  });
});
