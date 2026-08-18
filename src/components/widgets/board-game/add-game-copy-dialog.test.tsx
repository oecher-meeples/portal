import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddGameCopyDialog } from "@/components/widgets/board-game/add-game-copy-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const createGameCopyMock = vi.fn();
vi.mock("@/lib/ludothek/game-copies", () => ({
  createGameCopy: (...args: unknown[]) => createGameCopyMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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
    });
  });
});
