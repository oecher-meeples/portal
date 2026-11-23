import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "@/components/ui/use-media-query";

type Listener = (event: MediaQueryListEvent) => void;

/** Steuerbares `matchMedia` — jsdom bringt keins mit. */
function mockMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const list = {
    matches: initial,
    addEventListener: (_: string, listener: Listener) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) =>
      listeners.delete(listener),
  };
  const matchMedia = vi.fn(() => list);
  vi.stubGlobal("matchMedia", matchMedia);
  return {
    matchMedia,
    change(next: boolean) {
      list.matches = next;
      listeners.forEach((listener) =>
        listener({ matches: next } as MediaQueryListEvent),
      );
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIsMobile (#585)", () => {
  it("fragt den Bereich unterhalb von md ab", () => {
    const { matchMedia } = mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());

    expect(matchMedia).toHaveBeenCalledWith("(max-width: 767.98px)");
    expect(result.current).toBe(true);
  });

  it("reagiert ohne Reload auf einen Breakpoint-Wechsel", () => {
    const media = mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    act(() => media.change(false));
    expect(result.current).toBe(false);

    act(() => media.change(true));
    expect(result.current).toBe(true);
  });

  it("bleibt ohne matchMedia bei false (Desktop-Variante, SSR-sicher)", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});
