import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useInfiniteScroll } from "./use-infinite-scroll";

/** Captures the last IntersectionObserver callback so a test can fire it
 * manually — jsdom hat keine echte Scroll-/Viewport-Implementierung. */
let triggerIntersecting: (() => void) | undefined;

class FakeIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe() {
    triggerIntersecting = () =>
      this.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  triggerIntersecting = undefined;
});

type Props<T, C> = {
  items: T[];
  initialCount: number;
  step: number;
  onLoadMore?: (cursor: C) => void;
  cursor?: C;
  hasMore?: boolean;
  onState?: (state: { visibleItems: T[]; isEndReached: boolean }) => void;
};

/** Renders the hook attached to a real sentinel `<div>`, matching how every
 * production caller (`news-results-list.tsx`) uses it — the ref must be set
 * before the effect runs, exactly like React does on a normal mount. */
function Harness<T, C>({
  items,
  initialCount,
  step,
  onLoadMore,
  cursor,
  hasMore,
  onState,
}: Props<T, C>) {
  const { visibleItems, sentinelRef, isEndReached } = useInfiniteScroll(items, {
    initialCount,
    step,
    onLoadMore,
    cursor,
    hasMore,
  });
  onState?.({ visibleItems, isEndReached });
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

describe("useInfiniteScroll — Client-Modus (unverändert, #135)", () => {
  it("reveals step more items each time the sentinel is reached", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    let latest: { visibleItems: number[]; isEndReached: boolean } | undefined;

    render(
      <Harness
        items={items}
        initialCount={5}
        step={5}
        onState={(s) => (latest = s)}
      />,
    );

    expect(latest?.visibleItems).toHaveLength(5);
    expect(latest?.isEndReached).toBe(false);

    act(() => triggerIntersecting?.());

    expect(latest?.visibleItems).toHaveLength(10);
  });

  it("reports isEndReached once every item is visible", () => {
    let latest: { isEndReached: boolean } | undefined;

    render(
      <Harness
        items={[1, 2, 3]}
        initialCount={3}
        step={5}
        onState={(s) => (latest = s)}
      />,
    );

    expect(latest?.isEndReached).toBe(true);
  });
});

describe("useInfiniteScroll — Server-Request-Modus (#468)", () => {
  it("calls onLoadMore with the cursor exactly once per load step, not repeatedly", () => {
    const onLoadMore = vi.fn();

    render(
      <Harness
        items={[1, 2, 3]}
        initialCount={3}
        step={5}
        onLoadMore={onLoadMore}
        cursor="cursor-1"
        hasMore={true}
      />,
    );

    act(() => triggerIntersecting?.());
    // Sentinel bleibt sichtbar, solange keine neuen Items angekommen sind —
    // ein zweites Intersecting-Event darf nicht erneut nachladen.
    act(() => triggerIntersecting?.());

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(onLoadMore).toHaveBeenCalledWith("cursor-1");
  });

  it("allows loading the next page once new items have arrived", () => {
    const onLoadMore = vi.fn();
    let latest: { visibleItems: number[]; isEndReached: boolean } | undefined;

    const { rerender } = render(
      <Harness
        items={[1, 2, 3]}
        initialCount={3}
        step={5}
        onLoadMore={onLoadMore}
        cursor="cursor-1"
        hasMore={true}
        onState={(s) => (latest = s)}
      />,
    );

    act(() => triggerIntersecting?.());
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // Server-Antwort trifft ein: der Aufrufer hängt sie an `items` an und
    // übergibt den neuen Cursor.
    rerender(
      <Harness
        items={[1, 2, 3, 4, 5]}
        initialCount={3}
        step={5}
        onLoadMore={onLoadMore}
        cursor="cursor-2"
        hasMore={false}
        onState={(s) => (latest = s)}
      />,
    );

    act(() => triggerIntersecting?.());
    // hasMore ist jetzt false → kein weiterer Aufruf.
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(latest?.isEndReached).toBe(true);
    expect(latest?.visibleItems).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not call onLoadMore once isEndReached is true (hasMore: false)", () => {
    const onLoadMore = vi.fn();

    render(
      <Harness
        items={[1, 2, 3]}
        initialCount={3}
        step={5}
        onLoadMore={onLoadMore}
        cursor="cursor-1"
        hasMore={false}
      />,
    );

    act(() => triggerIntersecting?.());

    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
