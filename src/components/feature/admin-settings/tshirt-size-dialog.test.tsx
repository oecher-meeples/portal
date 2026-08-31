import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TshirtSizeDialog } from "@/components/feature/admin-settings/tshirt-size-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const loadTshirtSizesMock = vi.fn();
const createTshirtSizeMock = vi.fn();
const renameTshirtSizeMock = vi.fn();
const reorderTshirtSizesMock = vi.fn();
const deleteTshirtSizeMock = vi.fn();
vi.mock("@/components/feature/admin-settings/tshirt-size-actions", () => ({
  loadTshirtSizes: () => loadTshirtSizesMock(),
  createTshirtSize: (...args: unknown[]) => createTshirtSizeMock(...args),
  renameTshirtSize: (...args: unknown[]) => renameTshirtSizeMock(...args),
  reorderTshirtSizes: (...args: unknown[]) => reorderTshirtSizesMock(...args),
  deleteTshirtSize: (...args: unknown[]) => deleteTshirtSizeMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TshirtSizeDialog (#388)", () => {
  it("lists existing sizes with their member count", async () => {
    loadTshirtSizesMock.mockResolvedValue([
      { id: "s-1", label: "S", sortOrder: 0, memberCount: 2 },
    ]);
    const user = userEvent.setup();

    render(<TshirtSizeDialog />);
    await user.click(screen.getByText("T-Shirt-Größen"));

    expect(await screen.findByDisplayValue("S")).toBeInTheDocument();
    expect(screen.getByText("2 Mitglieder")).toBeInTheDocument();
  });

  it("warns with the affected member count before deleting a used size", async () => {
    loadTshirtSizesMock.mockResolvedValue([
      { id: "s-1", label: "S", sortOrder: 0, memberCount: 2 },
    ]);
    const user = userEvent.setup();

    render(<TshirtSizeDialog />);
    await user.click(screen.getByText("T-Shirt-Größen"));
    await screen.findByDisplayValue("S");

    await user.click(screen.getByRole("button", { name: /„S“ löschen/i }));

    expect(
      await screen.findByText(/2 Mitglieder haben diese Größe hinterlegt/),
    ).toBeInTheDocument();
    expect(deleteTshirtSizeMock).not.toHaveBeenCalled();
  });

  it("deletes a size with no members directly, no warning dialog", async () => {
    loadTshirtSizesMock.mockResolvedValue([
      { id: "s-1", label: "S", sortOrder: 0, memberCount: 0 },
    ]);
    deleteTshirtSizeMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<TshirtSizeDialog />);
    await user.click(screen.getByText("T-Shirt-Größen"));
    await screen.findByDisplayValue("S");

    fireEvent.click(screen.getByRole("button", { name: /„S“ löschen/i }));

    expect(deleteTshirtSizeMock).toHaveBeenCalledWith("s-1");
  });

  it("adds a new size", async () => {
    loadTshirtSizesMock.mockResolvedValue([]);
    createTshirtSizeMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<TshirtSizeDialog />);
    await user.click(screen.getByText("T-Shirt-Größen"));
    await screen.findByText("Noch keine T-Shirt-Größen angelegt.");

    await user.type(screen.getByPlaceholderText(/Neue Größe/), "XL");
    await user.click(screen.getByRole("button", { name: /hinzufügen/i }));

    expect(createTshirtSizeMock).toHaveBeenCalledWith("XL");
  });
});
