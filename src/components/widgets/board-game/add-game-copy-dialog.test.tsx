import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddGameCopyDialog } from "@/components/widgets/board-game/add-game-copy-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const createGameCopyMock = vi.fn();
const getSuggestedInventoryNumberMock = vi.fn();
vi.mock("@/lib/ludothek/game-copies", () => ({
  createGameCopy: (...args: unknown[]) => createGameCopyMock(...args),
  getSuggestedInventoryNumber: () => getSuggestedInventoryNumberMock(),
}));

vi.mock("@/lib/ludothek/taxonomy/contributor-actions", () => ({
  listContributorNames: async () => [],
}));
vi.mock("@/lib/ludothek/taxonomy/version-actions", () => ({
  getBoardGameEditions: async () => [],
  getUnsavedBggVersions: async () => [],
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

getSuggestedInventoryNumberMock.mockResolvedValue("1");

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Weiteres Exemplar/ }));
}

describe("AddGameCopyDialog", () => {
  it("shows the condition and Regelheft-Sprache(n) fields (#188/#203-Folge)", async () => {
    const user = userEvent.setup();
    render(
      <AddGameCopyDialog boardGameId="game-1" boardGameTitle="Arche Nova" />,
    );
    await openDialog(user);

    expect(screen.getByLabelText("Mängelvermerk")).toBeInTheDocument();
    expect(screen.getByLabelText("Deutsch")).toBeInTheDocument();
    expect(screen.getByLabelText("Englisch")).toBeInTheDocument();
    expect(screen.getByLabelText("Sonstige")).toBeInTheDocument();
  });

  it("submits the selected Regelheft-Sprache(n) alongside the condition", async () => {
    const user = userEvent.setup();
    createGameCopyMock.mockResolvedValue({ success: true, id: "copy-1" });
    render(
      <AddGameCopyDialog boardGameId="game-1" boardGameTitle="Arche Nova" />,
    );
    await openDialog(user);

    await user.type(screen.getByLabelText("Mängelvermerk"), "Leicht bespielt");
    await user.click(screen.getByLabelText("Deutsch"));
    await user.click(screen.getByLabelText("Englisch"));
    await user.click(screen.getByRole("button", { name: "Anlegen" }));

    expect(createGameCopyMock).toHaveBeenCalledWith("game-1", {
      condition: "Leicht bespielt",
      ruleBookLanguages: ["DE", "EN"],
      inventoryNumber: "1",
      edition: null,
    });
  });

  it("submits an empty Regelheft-Sprache(n) list when none is selected", async () => {
    const user = userEvent.setup();
    createGameCopyMock.mockResolvedValue({ success: true, id: "copy-1" });
    render(
      <AddGameCopyDialog boardGameId="game-1" boardGameTitle="Arche Nova" />,
    );
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: "Anlegen" }));

    expect(createGameCopyMock).toHaveBeenCalledWith("game-1", {
      condition: undefined,
      ruleBookLanguages: [],
      inventoryNumber: "1",
      edition: null,
    });
  });

  it("sends a new edition with its language when 'Neue Edition' is chosen", async () => {
    const user = userEvent.setup();
    createGameCopyMock.mockResolvedValue({ success: true, id: "copy-1" });
    render(
      <AddGameCopyDialog boardGameId="game-1" boardGameTitle="Arche Nova" />,
    );
    await openDialog(user);

    await user.selectOptions(
      screen.getByLabelText("Version"),
      "Neue Version manuell eingeben …",
    );
    await user.type(screen.getByLabelText("Sprache(n) der Version"), "English");
    await user.click(screen.getByRole("button", { name: "Anlegen" }));

    expect(createGameCopyMock).toHaveBeenCalledWith(
      "game-1",
      expect.objectContaining({
        edition: {
          version: expect.objectContaining({
            languages: ["English"],
            publishers: [],
          }),
        },
      }),
    );
  });
});
