import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const { useAction } = await import("./use-action");

afterEach(() => {
  refreshMock.mockClear();
});

describe("useAction", () => {
  it("does not refresh by default — revalidatePath re-renders already (#525)", async () => {
    const { result } = renderHook(() => useAction());

    await act(() => result.current.run(async () => ({ success: true })));

    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("refreshes after success when asked to", async () => {
    const { result } = renderHook(() => useAction({ refresh: true }));

    await act(() => result.current.run(async () => ({ success: true })));

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("neither refreshes nor calls onSuccess on an error result", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useAction({ refresh: true, onSuccess }),
    );

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.run(async () => ({ error: "Nope" }));
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe("Nope");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
