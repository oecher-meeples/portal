import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GameCopyExpandedDetails } from "@/components/feature/ludothek/game-copy-expanded-details";
import type { CopyHistory } from "@/lib/ludothek/copy-history";

vi.mock("@/components/widgets/game-holding/game-holding-panel", () => ({
  GameHoldingPanel: () => <p>Aufenthalt-Aktionen</p>,
}));

afterEach(() => {
  cleanup();
});

function holdings(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `h${i + 1}`,
    origin: "Ausleihe",
    target: `Person ${i + 1}`,
    startedAt: `${i + 1}.1.2026`,
    endedAt: null,
    confirmedAt: "2026-01-01T00:00:00.000Z",
    recordedByName: "Alex",
  }));
}

function checks(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i + 1}`,
    result: "COMPLETE" as const,
    resultLabel: "Vollständig",
    checkedAt: `${i + 1}.2.2026`,
    note: `Notiz ${i + 1}`,
    checkedByName: "Spielewart",
  }));
}

function renderDetails(history: CopyHistory) {
  render(<GameCopyExpandedDetails gameCopyId="copy-1" history={history} />);
}

describe("GameCopyExpandedDetails (#599)", () => {
  it("shows 5 of 7 checks and 5 of 15 stays, expanding each list on its own", () => {
    renderDetails({
      holdings: holdings(15),
      holdingsTruncated: true,
      checks: checks(7),
    });

    expect(screen.getAllByText(/Ausleihe →/)).toHaveLength(5);
    expect(screen.getAllByText(/kontrolliert von/)).toHaveLength(5);
    expect(
      screen.queryByText("Ältere Aufenthalte werden nicht angezeigt."),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Alle anzeigen (7)" }));
    expect(screen.getAllByText(/kontrolliert von/)).toHaveLength(7);
    expect(screen.getAllByText(/Ausleihe →/)).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "Alle anzeigen (15)" }));
    expect(screen.getAllByText(/Ausleihe →/)).toHaveLength(15);
    expect(
      screen.getByText("Ältere Aufenthalte werden nicht angezeigt."),
    ).toBeInTheDocument();
  });

  it("lists the newest entries first, in the order given", () => {
    renderDetails({
      holdings: [],
      holdingsTruncated: false,
      checks: checks(2),
    });

    const notes = screen.getAllByText(/^Notiz \d$/).map((n) => n.textContent);
    expect(notes).toEqual(["Notiz 1", "Notiz 2"]);
    expect(screen.getAllByText("Vollständig")).toHaveLength(2);
  });

  it("has no toggle when everything fits", () => {
    renderDetails({
      holdings: holdings(3),
      holdingsTruncated: false,
      checks: [],
    });

    expect(screen.queryByRole("button", { name: /Alle anzeigen/ })).toBeNull();
    expect(screen.queryByText("Kontroll-Historie")).not.toBeInTheDocument();
  });

  it("omits the check history without games:manage", () => {
    renderDetails({
      holdings: holdings(1),
      holdingsTruncated: false,
      checks: null,
    });

    expect(screen.getByText("Aufenthalts-Historie")).toBeInTheDocument();
    expect(screen.queryByText("Kontroll-Historie")).not.toBeInTheDocument();
  });
});
