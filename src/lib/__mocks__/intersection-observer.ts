import { vi } from "vitest";

/** jsdom kennt `IntersectionObserver` nicht — jede Liste mit
 * `useInfiniteScroll` (News #470, Ludothek #461) braucht im Test diesen
 * stummen Ersatz. Feuert nie; wer das Nachladen selbst testen will, nutzt
 * einen eigenen Fake wie in `use-infinite-scroll.test.tsx`. */
export function stubIntersectionObserver() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
}
