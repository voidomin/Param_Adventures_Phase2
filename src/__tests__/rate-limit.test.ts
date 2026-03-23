import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clear our mocked time
    vi.useRealTimers();
  });

  it('allows the first request and sets remaining limit', () => {
    const key = 'test-ip-1';
    const limit = 5;
    const windowMs = 10000;
    
    // Fixed time so we can check resetAt
    const now = 1000000;
    vi.setSystemTime(now);

    const result = rateLimit(key, limit, windowMs);
    
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
    expect(result.resetAt).toBe(now + windowMs);
  });

  it('allows multiple requests up to the limit', () => {
    const key = 'test-ip-2';
    const limit = 3;
    const windowMs = 10000;

    // 1st request
    rateLimit(key, limit, windowMs);
    // 2nd request
    const r2 = rateLimit(key, limit, windowMs);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    // 3rd request
    const r3 = rateLimit(key, limit, windowMs);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests once the limit is exceeded', () => {
    const key = 'test-ip-3';
    const limit = 2;
    const windowMs = 10000;

    rateLimit(key, limit, windowMs);
    rateLimit(key, limit, windowMs);
    
    // 3rd request should fail
    const blocked = rateLimit(key, limit, windowMs);
    
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets the limit once the time window has passed', () => {
    const key = 'test-ip-4';
    const limit = 2;
    const windowMs = 5000;
    
    const now = 1000000;
    vi.setSystemTime(now);

    // Consume all limit
    rateLimit(key, limit, windowMs);
    rateLimit(key, limit, windowMs);
    
    let blocked = rateLimit(key, limit, windowMs);
    expect(blocked.success).toBe(false);

    // Advance time past the windowMs
    vi.setSystemTime(now + 6000);

    // Request should now be allowed again (new window)
    const allowed = rateLimit(key, limit, windowMs);
    expect(allowed.success).toBe(true);
    expect(allowed.remaining).toBe(1);
  });
});
