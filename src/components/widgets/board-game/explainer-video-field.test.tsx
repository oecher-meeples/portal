import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExplainerVideoField } from "@/components/widgets/board-game/explainer-video-field";

// Die Auswahl-Logik selbst steckt im Dialog hinter dem Lupen-Icon — deren
// Tests liegen in explainer-video-search-dialog.test.tsx. Hier wird nur der
// gemockt, damit der reine Feld-Render keine Server-Action-Importkette zieht.
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  fetchExplainerVideoOptions: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ExplainerVideoField", () => {
  it("renders the video URL input and the search-dialog trigger", () => {
    render(
      <ExplainerVideoField
        idPrefix="test"
        value=""
        bggIdText=""
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText("Erklärvideo (YouTube-Link)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Erklärvideo suchen" }),
    ).toBeDisabled();
  });

  it("enables the search-dialog trigger once a valid bggId is set", () => {
    render(
      <ExplainerVideoField
        idPrefix="test"
        value=""
        bggIdText="342942"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Erklärvideo suchen" }),
    ).toBeEnabled();
  });

  it("reports a manually typed URL via onChange", () => {
    const onChange = vi.fn();
    render(
      <ExplainerVideoField
        idPrefix="test"
        value=""
        bggIdText=""
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Erklärvideo (YouTube-Link)"), {
      target: { value: "https://www.youtube.com/watch?v=manual" },
    });

    expect(onChange).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=manual",
    );
  });
});
