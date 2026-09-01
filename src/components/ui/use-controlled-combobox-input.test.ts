import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useControlledComboboxInput } from "@/components/ui/use-controlled-combobox-input";

describe("useControlledComboboxInput (Live-Review F14)", () => {
  it("initialises from selectedName instead of an empty string", () => {
    const { result } = renderHook(() =>
      useControlledComboboxInput("Erika Musterfrau"),
    );

    expect(result.current[0]).toBe("Erika Musterfrau");
  });

  it("initialises to an empty string without a selection", () => {
    const { result } = renderHook(() => useControlledComboboxInput(null));

    expect(result.current[0]).toBe("");
  });

  it("follows later changes to selectedName", () => {
    const { result, rerender } = renderHook(
      ({ selectedName }) => useControlledComboboxInput(selectedName),
      { initialProps: { selectedName: "Erika Musterfrau" as string | null } },
    );

    rerender({ selectedName: "Max Muster" });
    expect(result.current[0]).toBe("Max Muster");

    rerender({ selectedName: null });
    expect(result.current[0]).toBe("");
  });

  it("still allows free-typed input via the returned setter", () => {
    const { result } = renderHook(() =>
      useControlledComboboxInput("Erika Musterfrau"),
    );

    act(() => {
      result.current[1]("Eri");
    });

    expect(result.current[0]).toBe("Eri");
  });
});
