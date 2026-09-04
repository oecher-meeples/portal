import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLongPress } from "./use-long-press";

describe("useLongPress (#465)", () => {
  it("fires onLongPress after the delay once pressed and held", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, 500));

    act(() => result.current.handlers.onPointerDown());
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).toHaveBeenCalledOnce();
    expect(result.current.consumeFired()).toBe(true);

    vi.useRealTimers();
  });

  it("does not fire when released before the delay", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, 500));

    act(() => result.current.handlers.onPointerDown());
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.handlers.onPointerUp());
    act(() => vi.advanceTimersByTime(500));

    expect(onLongPress).not.toHaveBeenCalled();
    expect(result.current.consumeFired()).toBe(false);

    vi.useRealTimers();
  });

  it("consumeFired resets after being read once", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLongPress(vi.fn(), 500));

    act(() => result.current.handlers.onPointerDown());
    act(() => vi.advanceTimersByTime(500));

    expect(result.current.consumeFired()).toBe(true);
    expect(result.current.consumeFired()).toBe(false);

    vi.useRealTimers();
  });
});
