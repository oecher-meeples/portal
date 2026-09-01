import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { VereinsspieleSection } from "@/components/feature/mitglied-profil/vereinsspiele-section";

vi.mock("@/components/widgets/game-holding/holding-mini-dialogs", () => ({
  GiveToMeepleDialog: () => <button>Weitergeben</button>,
  AcceptReturnDialog: () => <button>Rückgabe</button>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("VereinsspieleSection (#383)", () => {
  it("renders nothing without active holdings", () => {
    const { container } = render(<VereinsspieleSection holdings={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("lists active holdings with quick actions", () => {
    render(
      <VereinsspieleSection
        holdings={[
          {
            gameCopyId: "copy-1",
            boardGameId: "bg-1",
            boardGameTitle: "Ark Nova",
            startedAt: new Date("2026-08-01"),
            locationChain: "",
            condition: null,
            ruleBookLanguages: [],
            inventoryNumber: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("Ark Nova")).toBeInTheDocument();
    expect(screen.getByText("Weitergeben")).toBeInTheDocument();
    expect(screen.getByText("Rückgabe")).toBeInTheDocument();
  });
});
