import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TitleOverviewDialog } from "@/components/widgets/board-game/title-overview-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const listAlternateNamesMock = vi.fn();
const addAlternateNameMock = vi.fn();
const deleteAlternateNameMock = vi.fn();
const promoteAlternateNameToTitleMock = vi.fn();
const promoteAlternateNameToSecondaryTitleMock = vi.fn();
const swapTitleAndSecondaryTitleMock = vi.fn();
const clearSecondaryTitleMock = vi.fn();
const deleteSecondaryTitleMock = vi.fn();
vi.mock("@/lib/ludothek/board-game-alternate-names", () => ({
  listAlternateNames: (...args: unknown[]) => listAlternateNamesMock(...args),
  addAlternateName: (...args: unknown[]) => addAlternateNameMock(...args),
  deleteAlternateName: (...args: unknown[]) => deleteAlternateNameMock(...args),
  promoteAlternateNameToTitle: (...args: unknown[]) =>
    promoteAlternateNameToTitleMock(...args),
  promoteAlternateNameToSecondaryTitle: (...args: unknown[]) =>
    promoteAlternateNameToSecondaryTitleMock(...args),
  swapTitleAndSecondaryTitle: (...args: unknown[]) =>
    swapTitleAndSecondaryTitleMock(...args),
  clearSecondaryTitle: (...args: unknown[]) => clearSecondaryTitleMock(...args),
  deleteSecondaryTitle: (...args: unknown[]) =>
    deleteSecondaryTitleMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Alternativtitel" }));
}

describe("TitleOverviewDialog (#203/#203-Folge)", () => {
  it("shows the main title, secondary title and alternate names as rows", async () => {
    const user = userEvent.setup();
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [
        { id: "alt-1", name: "Die Siedler von Catan", note: null },
      ],
    });

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Arche Nova"
        secondaryTitle="Ark Nova"
        onTitleChange={vi.fn()}
        onSecondaryTitleChange={vi.fn()}
      />,
    );
    await openDialog(user);

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(screen.getByText("Ark Nova")).toBeInTheDocument();
    expect(
      await screen.findByText("Die Siedler von Catan"),
    ).toBeInTheDocument();
  });

  it("omits the secondary title row when none is set", async () => {
    const user = userEvent.setup();
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [],
    });

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Arche Nova"
        secondaryTitle=""
        onTitleChange={vi.fn()}
        onSecondaryTitleChange={vi.fn()}
      />,
    );
    await openDialog(user);

    await waitFor(() => expect(listAlternateNamesMock).toHaveBeenCalled());
    expect(screen.queryByText("Ark Nova")).not.toBeInTheDocument();
    // No secondary title means nothing to swap into it either.
    expect(
      screen.getByRole("button", { name: "Als Sekundärtitel verwenden" }),
    ).toBeDisabled();
  });

  it("swaps title and secondary title from the main title's row", async () => {
    const user = userEvent.setup();
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [],
    });
    swapTitleAndSecondaryTitleMock.mockResolvedValue({ success: true });
    const onTitleChange = vi.fn();
    const onSecondaryTitleChange = vi.fn();

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Arche Nova"
        secondaryTitle="Ark Nova"
        onTitleChange={onTitleChange}
        onSecondaryTitleChange={onSecondaryTitleChange}
      />,
    );
    await openDialog(user);

    await user.click(
      screen.getByRole("button", { name: "Als Sekundärtitel verwenden" }),
    );

    await waitFor(() =>
      expect(swapTitleAndSecondaryTitleMock).toHaveBeenCalledWith("game-1"),
    );
    expect(onTitleChange).toHaveBeenCalledWith("Ark Nova");
    expect(onSecondaryTitleChange).toHaveBeenCalledWith("Arche Nova");
  });

  it("swaps title and secondary title from the secondary title's row", async () => {
    const user = userEvent.setup();
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [],
    });
    swapTitleAndSecondaryTitleMock.mockResolvedValue({ success: true });
    const onTitleChange = vi.fn();
    const onSecondaryTitleChange = vi.fn();

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Arche Nova"
        secondaryTitle="Ark Nova"
        onTitleChange={onTitleChange}
        onSecondaryTitleChange={onSecondaryTitleChange}
      />,
    );
    await openDialog(user);

    await user.click(
      screen.getByRole("button", { name: "Als Haupttitel verwenden" }),
    );

    await waitFor(() =>
      expect(swapTitleAndSecondaryTitleMock).toHaveBeenCalledWith("game-1"),
    );
    expect(onTitleChange).toHaveBeenCalledWith("Ark Nova");
    expect(onSecondaryTitleChange).toHaveBeenCalledWith("Arche Nova");
  });

  it("removes only the secondary-title status after confirmation, keeping the text as an alternate name", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [],
    });
    clearSecondaryTitleMock.mockResolvedValue({ success: true });
    const onSecondaryTitleChange = vi.fn();

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Arche Nova"
        secondaryTitle="Ark Nova"
        onTitleChange={vi.fn()}
        onSecondaryTitleChange={onSecondaryTitleChange}
      />,
    );
    await openDialog(user);

    await user.click(
      screen.getByRole("button", { name: "Als Sekundärtitel entfernen" }),
    );

    expect(window.confirm).toHaveBeenCalledWith(
      "Sekundärtitel wirklich entfernen? Der Text bleibt als Alternativname erhalten.",
    );
    await waitFor(() =>
      expect(clearSecondaryTitleMock).toHaveBeenCalledWith("game-1"),
    );
    expect(onSecondaryTitleChange).toHaveBeenCalledWith("");
  });

  it("deletes the secondary title for good via the delete button", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [],
    });
    deleteSecondaryTitleMock.mockResolvedValue({ success: true });
    const onSecondaryTitleChange = vi.fn();

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Arche Nova"
        secondaryTitle="Ark Nova"
        onTitleChange={vi.fn()}
        onSecondaryTitleChange={onSecondaryTitleChange}
      />,
    );
    await openDialog(user);

    await user.click(
      screen.getByRole("button", { name: "Sekundärtitel löschen" }),
    );

    expect(window.confirm).toHaveBeenCalledWith(
      "Sekundärtitel endgültig löschen? Der Text geht dabei verloren.",
    );
    await waitFor(() =>
      expect(deleteSecondaryTitleMock).toHaveBeenCalledWith("game-1"),
    );
    expect(onSecondaryTitleChange).toHaveBeenCalledWith("");
  });

  it("promotes an alternate name to the main title", async () => {
    const user = userEvent.setup();
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [{ id: "alt-1", name: "Catan", note: null }],
    });
    promoteAlternateNameToTitleMock.mockResolvedValue({ success: true });
    const onTitleChange = vi.fn();

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Die Siedler von Catan"
        secondaryTitle=""
        onTitleChange={onTitleChange}
        onSecondaryTitleChange={vi.fn()}
      />,
    );
    await openDialog(user);

    await screen.findByText("Catan");
    const row = screen.getByText("Catan").closest("li")!;
    await user.click(
      within(row).getByRole("button", { name: "Als Haupttitel verwenden" }),
    );

    await waitFor(() =>
      expect(promoteAlternateNameToTitleMock).toHaveBeenCalledWith("alt-1"),
    );
    expect(onTitleChange).toHaveBeenCalledWith("Catan");
  });

  it("promotes an alternate name to the secondary title", async () => {
    const user = userEvent.setup();
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [{ id: "alt-1", name: "Catan", note: null }],
    });
    promoteAlternateNameToSecondaryTitleMock.mockResolvedValue({
      success: true,
    });
    const onSecondaryTitleChange = vi.fn();

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Die Siedler von Catan"
        secondaryTitle=""
        onTitleChange={vi.fn()}
        onSecondaryTitleChange={onSecondaryTitleChange}
      />,
    );
    await openDialog(user);

    await screen.findByText("Catan");
    const row = screen.getByText("Catan").closest("li")!;
    await user.click(
      within(row).getByRole("button", {
        name: "Als Sekundärtitel verwenden",
      }),
    );

    await waitFor(() =>
      expect(promoteAlternateNameToSecondaryTitleMock).toHaveBeenCalledWith(
        "alt-1",
      ),
    );
    expect(onSecondaryTitleChange).toHaveBeenCalledWith("Catan");
  });

  it("deletes an alternate name via the icon button after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    listAlternateNamesMock
      .mockResolvedValueOnce({
        success: true,
        alternateNames: [{ id: "alt-1", name: "Catan", note: null }],
      })
      .mockResolvedValueOnce({ success: true, alternateNames: [] });
    deleteAlternateNameMock.mockResolvedValue({ success: true });

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Die Siedler von Catan"
        secondaryTitle=""
        onTitleChange={vi.fn()}
        onSecondaryTitleChange={vi.fn()}
      />,
    );
    await openDialog(user);

    await screen.findByText("Catan");
    await user.click(screen.getByRole("button", { name: "„Catan“ löschen" }));

    expect(window.confirm).toHaveBeenCalledWith("„Catan“ wirklich löschen?");
    await waitFor(() =>
      expect(deleteAlternateNameMock).toHaveBeenCalledWith("alt-1"),
    );
  });

  it("adds a new alternate name and refreshes the list", async () => {
    const user = userEvent.setup();
    listAlternateNamesMock
      .mockResolvedValueOnce({ success: true, alternateNames: [] })
      .mockResolvedValueOnce({
        success: true,
        alternateNames: [{ id: "alt-1", name: "Catan", note: null }],
      });
    addAlternateNameMock.mockResolvedValue({ success: true });

    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Die Siedler von Catan"
        secondaryTitle=""
        onTitleChange={vi.fn()}
        onSecondaryTitleChange={vi.fn()}
      />,
    );
    await openDialog(user);

    await user.type(
      screen.getByPlaceholderText("Neuer Alternativname"),
      "Catan",
    );
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    await waitFor(() =>
      expect(addAlternateNameMock).toHaveBeenCalledWith("game-1", "Catan"),
    );
    expect(await screen.findByText("Catan")).toBeInTheDocument();
  });
});
