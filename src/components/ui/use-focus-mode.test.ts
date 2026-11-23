import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  FOCUS_MODE_ATTRIBUTE,
  useFocusMode,
} from "@/components/ui/use-focus-mode";

type Listener = (event: MediaQueryListEvent) => void;

/** Steuerbares `matchMedia` — `true` = Viewport unterhalb von `md`. */
function mockViewport(mobile: boolean) {
  const listeners = new Set<Listener>();
  const list = {
    matches: mobile,
    addEventListener: (_: string, listener: Listener) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) =>
      listeners.delete(listener),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => list),
  );
  return (next: boolean) => {
    list.matches = next;
    listeners.forEach((listener) =>
      listener({ matches: next } as MediaQueryListEvent),
    );
  };
}

function hasAttribute() {
  return document.documentElement.hasAttribute(FOCUS_MODE_ATTRIBUTE);
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute(FOCUS_MODE_ATTRIBUTE);
});

describe("useFocusMode (#587)", () => {
  it("setzt und entfernt das Attribut am <html> beim Umschalten", () => {
    mockViewport(true);
    const { result } = renderHook(() => useFocusMode());
    expect(result.current.available).toBe(true);
    expect(hasAttribute()).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.active).toBe(true);
    expect(hasAttribute()).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.active).toBe(false);
    expect(hasAttribute()).toBe(false);
  });

  it("setzt den Modus beim Unmount zurück", () => {
    mockViewport(true);
    const { result, unmount } = renderHook(() => useFocusMode());
    act(() => result.current.toggle());
    expect(hasAttribute()).toBe(true);

    unmount();
    expect(hasAttribute()).toBe(false);
  });

  it("endet beim Wechsel auf ≥ md und lebt beim Zurückwechseln nicht wieder auf", () => {
    const resize = mockViewport(true);
    const { result } = renderHook(() => useFocusMode());
    act(() => result.current.toggle());
    expect(hasAttribute()).toBe(true);

    act(() => resize(false));
    expect(result.current.available).toBe(false);
    expect(result.current.active).toBe(false);
    expect(hasAttribute()).toBe(false);

    act(() => resize(true));
    expect(result.current.active).toBe(false);
    expect(hasAttribute()).toBe(false);
  });
});
