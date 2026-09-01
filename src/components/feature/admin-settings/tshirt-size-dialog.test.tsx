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

/** jsdom has no working native DataTransfer — a minimal stand-in that
 * supports exactly what the component uses (analog role-management-section.test.tsx, #391). */
function fakeDataTransfer() {
  const store = new Map<string, string>();
  return {
    effectAllowed: "none",
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
  };
}

/** Die Drop-Zone (`DropGap`) unmittelbar *vor* der Zeile mit diesem Label —
 * Zeilen und Lücken sind flache Geschwister (kein Wrapper-`<div>` dazwischen). */
function dropGapBefore(labelText: string) {
  const rowRoot = screen
    .getByDisplayValue(labelText)
    .closest("div")!.parentElement!;
  return rowRoot.previousElementSibling as HTMLElement;
}

/** Die Drop-Zone unmittelbar *nach* der Zeile mit diesem Label. */
function dropGapAfter(labelText: string) {
  const rowRoot = screen
    .getByDisplayValue(labelText)
    .closest("div")!.parentElement!;
  return rowRoot.nextElementSibling as HTMLElement;
}

describe("TshirtSizeDialog (#388)", () => {
  it("shows an accent-colored badge with the size count", () => {
    render(<TshirtSizeDialog count={6} />);
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("marks a size count of 0 as a warning", () => {
    render(<TshirtSizeDialog count={0} />);
    expect(screen.getByText("0")).toHaveClass("bg-amber-500/15");
  });

  it("lists existing sizes with their member count", async () => {
    loadTshirtSizesMock.mockResolvedValue([
      { id: "s-1", label: "S", sortOrder: 0, memberCount: 2 },
    ]);
    const user = userEvent.setup();

    render(<TshirtSizeDialog count={1} />);
    await user.click(screen.getByText("T-Shirt-Größen"));

    expect(await screen.findByDisplayValue("S")).toBeInTheDocument();
    expect(screen.getByText("2 Mitglieder")).toBeInTheDocument();
  });

  it("warns with the affected member count before deleting a used size", async () => {
    loadTshirtSizesMock.mockResolvedValue([
      { id: "s-1", label: "S", sortOrder: 0, memberCount: 2 },
    ]);
    const user = userEvent.setup();

    render(<TshirtSizeDialog count={1} />);
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

    render(<TshirtSizeDialog count={1} />);
    await user.click(screen.getByText("T-Shirt-Größen"));
    await screen.findByDisplayValue("S");

    fireEvent.click(screen.getByRole("button", { name: /„S“ löschen/i }));

    expect(deleteTshirtSizeMock).toHaveBeenCalledWith("s-1");
  });

  it("adds a new size", async () => {
    loadTshirtSizesMock.mockResolvedValue([]);
    createTshirtSizeMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<TshirtSizeDialog count={1} />);
    await user.click(screen.getByText("T-Shirt-Größen"));
    await screen.findByText("Noch keine T-Shirt-Größen angelegt.");

    await user.type(screen.getByPlaceholderText(/Neue Größe/), "XL");
    await user.click(screen.getByRole("button", { name: /hinzufügen/i }));

    expect(createTshirtSizeMock).toHaveBeenCalledWith("XL");
  });

  it("persists the dragged size's new position via reorderTshirtSizes", async () => {
    loadTshirtSizesMock.mockResolvedValue([
      { id: "s-1", label: "S", sortOrder: 0, memberCount: 0 },
      { id: "s-2", label: "M", sortOrder: 1, memberCount: 0 },
    ]);
    reorderTshirtSizesMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<TshirtSizeDialog count={1} />);
    await user.click(screen.getByText("T-Shirt-Größen"));
    await screen.findByDisplayValue("S");

    const dataTransfer = fakeDataTransfer();
    const handle = screen.getByLabelText("„M“ per Drag-and-Drop verschieben");
    const gapBeforeS = dropGapBefore("S");

    fireEvent.dragStart(handle, { dataTransfer });
    fireEvent.dragOver(gapBeforeS, { dataTransfer });
    expect(gapBeforeS.firstElementChild).toHaveClass("bg-primary");
    fireEvent.drop(gapBeforeS, { dataTransfer });

    expect(reorderTshirtSizesMock).toHaveBeenCalledWith(["s-2", "s-1"]);
  });

  it("drops into the gap after the last row, to reach the last position", async () => {
    loadTshirtSizesMock.mockResolvedValue([
      { id: "s-1", label: "S", sortOrder: 0, memberCount: 0 },
      { id: "s-2", label: "M", sortOrder: 1, memberCount: 0 },
      { id: "s-3", label: "L", sortOrder: 2, memberCount: 0 },
    ]);
    reorderTshirtSizesMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<TshirtSizeDialog count={1} />);
    await user.click(screen.getByText("T-Shirt-Größen"));
    await screen.findByDisplayValue("S");

    const dataTransfer = fakeDataTransfer();
    const handle = screen.getByLabelText("„S“ per Drag-and-Drop verschieben");
    const gapAfterL = dropGapAfter("L");

    fireEvent.dragStart(handle, { dataTransfer });
    fireEvent.dragOver(gapAfterL, { dataTransfer });
    fireEvent.drop(gapAfterL, { dataTransfer });

    expect(reorderTshirtSizesMock).toHaveBeenCalledWith(["s-2", "s-3", "s-1"]);
  });

  it("only highlights the gap the pointer is currently over, not two at once", async () => {
    loadTshirtSizesMock.mockResolvedValue([
      { id: "s-1", label: "S", sortOrder: 0, memberCount: 0 },
      { id: "s-2", label: "M", sortOrder: 1, memberCount: 0 },
    ]);
    const user = userEvent.setup();

    render(<TshirtSizeDialog count={1} />);
    await user.click(screen.getByText("T-Shirt-Größen"));
    await screen.findByDisplayValue("S");

    const dataTransfer = fakeDataTransfer();
    const handle = screen.getByLabelText("„S“ per Drag-and-Drop verschieben");
    const gapBetween = dropGapAfter("S");

    fireEvent.dragStart(handle, { dataTransfer });
    fireEvent.dragOver(gapBetween, { dataTransfer });

    expect(gapBetween.firstElementChild).toHaveClass("bg-primary");
    expect(dropGapBefore("M").firstElementChild).toBe(
      gapBetween.firstElementChild,
    );
  });
});
