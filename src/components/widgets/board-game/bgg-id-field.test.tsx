import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BggIdField } from "@/components/widgets/board-game/bgg-id-field";

// Die Such-/Auswahl-Logik selbst steckt im Dialog hinter dem Lupen-Icon —
// deren Tests liegen in bgg-id-search-dialog.test.tsx. Hier wird nur
// gemockt, damit der reine Feld-Render keine Server-Action-Importkette zieht.
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  searchBggGamesAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BggIdField", () => {
  it("shows the search-dialog trigger when the field is empty (#206)", () => {
    render(
      <BggIdField
        idPrefix="test"
        value=""
        title="Ark Nova"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "BGG-ID per Namenssuche finden" }),
    ).toBeInTheDocument();
  });

  it("hides the search-dialog trigger once a BGG-ID is entered (#206)", () => {
    render(
      <BggIdField
        idPrefix="test"
        value="342942"
        title="Ark Nova"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "BGG-ID per Namenssuche finden" }),
    ).not.toBeInTheDocument();
  });

  it("reports a manually typed BGG-ID via onChange", () => {
    const onChange = vi.fn();
    render(
      <BggIdField
        idPrefix="test"
        value=""
        title="Ark Nova"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("BGG-ID"), {
      target: { value: "342942" },
    });

    expect(onChange).toHaveBeenCalledWith("342942");
  });
});
