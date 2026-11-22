import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionDialog } from "@/components/ui/action-dialog";
import { GameTitleActions } from "@/components/feature/ludothek/game-title-actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

function renderActions() {
  render(
    <GameTitleActions
      actions={[
        {
          key: "create-lfg",
          label: "Spielergesuch eröffnen",
          icon: null,
          node: (
            <ActionDialog
              trigger={<button type="button">Gesuch (Einzelbutton)</button>}
              title="Neues Spielergesuch"
              submitLabel="Erstellen"
              action={async () => undefined}
            />
          ),
        },
        {
          key: "bgg",
          label: "Auf BoardGameGeek ansehen",
          icon: null,
          href: "https://boardgamegeek.com/boardgame/1",
          external: true,
          node: <a href="https://boardgamegeek.com/boardgame/1">BGG</a>,
        },
      ]}
    />,
  );
}

describe("GameTitleActions — ⋯-Menü (#586)", () => {
  it("opens the same dialog from the menu entry and keeps it open after the menu closes", async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole("button", { name: "Weitere Aktionen" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Spielergesuch eröffnen" }),
    );

    expect(await screen.findByText("Neues Spielergesuch")).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByText("Neues Spielergesuch")).toBeInTheDocument();
  });

  it("still opens the dialog from the single button", async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByText("Gesuch (Einzelbutton)"));

    expect(await screen.findByText("Neues Spielergesuch")).toBeInTheDocument();
  });

  it("renders link actions as menu links (new tab for external)", async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole("button", { name: "Weitere Aktionen" }));
    const item = await screen.findByRole("menuitem", {
      name: "Auf BoardGameGeek ansehen",
    });

    expect(item).toHaveAttribute(
      "href",
      "https://boardgamegeek.com/boardgame/1",
    );
    expect(item).toHaveAttribute("target", "_blank");
  });
});
