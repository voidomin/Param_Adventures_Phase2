import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Polyfill for HTMLDialogElement (JSDOM does not support showModal/close)
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
}

// Global Mocks to reduce duplication across the test suite
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/admin/mock-path",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => new Headers(),
  cookies: () => ({ get: vi.fn(), set: vi.fn() }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    booking: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    experience: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    category: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    review: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    blog: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    hero: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
  }
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "mock-admin-id", role: "ADMIN" } }),
  hashPassword: vi.fn().mockResolvedValue("hashed_pwd"),
  comparePasswords: vi.fn().mockResolvedValue(true),
  generateAccessToken: vi.fn().mockReturnValue("mock_access_token"),
  generateRefreshToken: vi.fn().mockReturnValue("mock_refresh_token"),
}));

