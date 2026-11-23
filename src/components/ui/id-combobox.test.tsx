import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdCombobox } from "./id-combobox";

afterEach(() => {
  cleanup();
});

const OPTIONS = [
  { id: "m-1", label: "Max Demo" },
  { id: "m-2", label: "Maria Demo" },
  { id: "m-3", label: "Uwe Beispiel" },
];

describe("IdCombobox", () => {
  it("takes the first match on Enter (#573)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <IdCombobox
        options={OPTIONS}
        value={null}
        onValueChange={onValueChange}
      />,
    );

    await user.type(screen.getByRole("combobox"), "Mar{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("m-2");
  });
});
