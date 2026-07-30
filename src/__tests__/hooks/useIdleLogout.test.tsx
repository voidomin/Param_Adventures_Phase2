import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIdleLogout } from "@/hooks/useIdleLogout";

describe("useIdleLogout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onIdle after the timeout with no activity", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleLogout(onIdle, 1000));

    vi.advanceTimersByTime(999);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on activity, so it doesn't fire early", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleLogout(onIdle, 1000));

    vi.advanceTimersByTime(600);
    window.dispatchEvent(new Event("mousemove"));
    vi.advanceTimersByTime(600);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("stops firing once unmounted", () => {
    const onIdle = vi.fn();
    const { unmount } = renderHook(() => useIdleLogout(onIdle, 1000));
    unmount();

    vi.advanceTimersByTime(2000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("always calls the latest onIdle callback, not a stale closure", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }: { cb: () => void }) => useIdleLogout(cb, 1000), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });
    vi.advanceTimersByTime(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
