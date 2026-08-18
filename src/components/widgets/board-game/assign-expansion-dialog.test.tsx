import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardGameKind } from "@prisma/client";
import { AssignExpansionDialog } from "@/components/widgets/board-game/assign-expansion-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const assignExpansionMock = vi.fn();
vi.mock("@/lib/ludothek/board-games", () => ({
  assignExpansion: (...args: unknown[]) => assignExpansionMock(...args),
}));

// The nested "Spiel anlegen"-Flow (#183) has its own extensive test suite —
// here only its `onCreated` contract matters, so it's mocked to a trigger
// button that fires it directly (#204).
vi.mock("@/components/widgets/board-game/create-board-game-dialog", () => ({
  CreateBoardGameDialog: ({
    onCreated,
  }: {
    onCreated?: (game: { id: string; title: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onCreated?.({ id: "new-game", title: "Neues Spiel" })}
    >
      Spiel anlegen
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const OPTIONS = [
  { id: "game-1", title: "Arche Nova" },
  { id: "game-2", title: "Arche Nova: Marschmoor" },
];

async function openDialog(
  user: ReturnType<typeof userEvent.setup>,
  triggerLabel: string,
) {
  await user.click(screen.getByRole("button", { name: triggerLabel }));
  return screen.findByRole("dialog");
}

describe("AssignExpansionDialog — Combobox statt Dropdown (#204)", () => {
  it("shows the base-game label for an expansion and vice versa", async () => {
    const user = userEvent.setup();
    render(
      <AssignExpansionDialog
        game={{ id: "expansion-1", kind: BoardGameKind.BOARDGAME_EXPANSION }}
        options={OPTIONS}
      />,
    );

    await openDialog(user, "Basisspiel zuordnen");
    expect(
      screen.getByRole("dialog", { name: "Basisspiel zuordnen" }),
    ).toBeInTheDocument();
  });

  it("selects an option via the combobox and assigns it on submit", async () => {
    const user = userEvent.setup();
    assignExpansionMock.mockResolvedValue({ success: true });
    render(
      <AssignExpansionDialog
        game={{ id: "title-1", kind: BoardGameKind.BOARDGAME }}
        options={OPTIONS}
      />,
    );

    const dialog = await openDialog(user, "Erweiterung hinzufügen");
    await user.click(within(dialog).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Arche Nova" }));
    await user.click(within(dialog).getByRole("button", { name: "Zuordnen" }));

    expect(assignExpansionMock).toHaveBeenCalledWith("title-1", "game-1");
  });

  it("keeps the submit button disabled until an option is selected", async () => {
    const user = userEvent.setup();
    render(
      <AssignExpansionDialog
        game={{ id: "title-1", kind: BoardGameKind.BOARDGAME }}
        options={OPTIONS}
      />,
    );

    const dialog = await openDialog(user, "Erweiterung hinzufügen");

    expect(
      within(dialog).getByRole("button", { name: "Zuordnen" }),
    ).toBeDisabled();
  });

  it("offers the Spiel-anlegen flow when the search has no hits, and adopts the created title as the selection (#204)", async () => {
    const user = userEvent.setup();
    assignExpansionMock.mockResolvedValue({ success: true });
    render(
      <AssignExpansionDialog
        game={{ id: "title-1", kind: BoardGameKind.BOARDGAME }}
        options={OPTIONS}
      />,
    );

    const dialog = await openDialog(user, "Erweiterung hinzufügen");
    // Referenz vor der Auswahl greifen — während das Combobox-Popup offen
    // ist, macht Base UI den Rest des Dialogs `aria-hidden` (inert), eine
    // Rollen-Query würde den Button danach nicht mehr finden (#204).
    const zuordnenButton = within(dialog).getByRole("button", {
      name: "Zuordnen",
    });
    await user.type(
      within(dialog).getByRole("combobox"),
      "Ein völlig unbekannter Titel",
    );

    const createButton = await screen.findByRole("button", {
      name: "Spiel anlegen",
    });
    await user.click(createButton);

    expect(within(dialog).getByRole("combobox")).toHaveValue("Neues Spiel");
    expect(zuordnenButton).toBeEnabled();

    zuordnenButton.click();
    expect(assignExpansionMock).toHaveBeenCalledWith("title-1", "new-game");
  });
});
