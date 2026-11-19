import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
const createStorageUnitMock = vi
  .fn()
  .mockResolvedValue({ success: true, id: "unit-1", code: "OM-SHELF-0007" });
vi.mock("@/components/feature/admin-einheiten/actions", () => ({
  createStorageUnit: (...args: unknown[]) => createStorageUnitMock(...args),
}));

const { CreateStorageUnitDialog } =
  await import("./create-storage-unit-dialog");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CreateStorageUnitDialog — gescanntes Etikett (#549)", () => {
  it("opens immediately with the scanned code and kind fixed", async () => {
    const user = userEvent.setup();
    render(
      <CreateStorageUnitDialog
        prefill={{ kind: "SHELF", code: "OM-SHELF-0007" }}
      />,
    );

    await screen.findByRole("dialog");
    expect(
      screen.getByText("Code OM-SHELF-0007 vom gescannten Etikett."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Karton" }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Label/), "Regal Keller");
    await user.click(
      screen.getAllByRole("button", { name: "Einheit anlegen" }).at(-1)!,
    );

    await waitFor(() =>
      expect(createStorageUnitMock).toHaveBeenCalledWith({
        kind: "SHELF",
        label: "Regal Keller",
        code: "OM-SHELF-0007",
        locationNote: undefined,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("stays closed and auto-numbers without a prefill", () => {
    render(<CreateStorageUnitDialog />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
