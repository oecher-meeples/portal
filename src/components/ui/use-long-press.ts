import { useRef } from "react";

const DEFAULT_DELAY_MS = 500;

/**
 * Fires `onLongPress` after the pointer (mouse or touch, via the unified
 * Pointer Events API) has been held down for `delayMs` (default 500ms) —
 * cancels if released/dragged away before then. Spread the returned
 * handlers onto the target element (#465, Meeple-QR-Code per Longpress im
 * Header).
 */
export function useLongPress(
  onLongPress: () => void,
  delayMs: number = DEFAULT_DELAY_MS,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  function start() {
    clear();
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, delayMs);
  }

  function clear() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  /** True only right after a long press fired — use in a `click`-Handler,
   * um das normale Klick-/Navigations-Verhalten für diesen einen Klick zu
   * unterdrücken (ein Longpress löst auf den meisten Plattformen danach
   * trotzdem ein `click`-Event aus). */
  function consumeFired() {
    const fired = firedRef.current;
    firedRef.current = false;
    return fired;
  }

  return {
    consumeFired,
    handlers: {
      onPointerDown: start,
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
    },
  };
}
