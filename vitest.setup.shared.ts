import { vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: () => new Headers(),
  cookies: () => ({ get: vi.fn(), set: vi.fn() }),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    booking: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    experience: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    category: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    review: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    blog: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    hero: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'mock-admin-id', role: 'ADMIN' } }),
  hashPassword: vi.fn().mockResolvedValue('hashed_pwd'),
  comparePasswords: vi.fn().mockResolvedValue(true),
  generateAccessToken: vi.fn().mockReturnValue('mock_access_token'),
  generateRefreshToken: vi.fn().mockReturnValue('mock_refresh_token'),
}));

vi.mock('@/lib/api-auth', () => ({
  authorizeRequest: vi.fn().mockResolvedValue({ authorized: true, user: { id: 'mock-admin-id', role: 'ADMIN' } }),
}));

// Keep default fetch deterministic for tests that don't stub it.
globalThis.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response),
);

vi.mock('razorpay', () => {
  return {
    default: class MockRazorpay {
      orders = {
        create: vi.fn().mockResolvedValue({ id: 'mock_order_id' }),
        fetch: vi.fn(),
      };
      payments = {
        fetch: vi.fn(),
        capture: vi.fn(),
      };
    },
  };
});