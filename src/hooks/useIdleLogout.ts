"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Auto-signs the user out after a period of inactivity. Intended for the
 * admin layout specifically -- admin/staff sessions carry far more risk if
 * left unattended (e.g. an unlocked laptop in a shared office) than a
 * regular customer session, so they get a stricter, enforced idle timeout
 * on top of the normal JWT expiry.
 */
export function useIdleLogout(onIdle: () => void, timeoutMs: number = 15 * 60 * 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [timeoutMs]);
}
