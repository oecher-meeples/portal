import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ImportJobStatus } from "@/components/widgets/private-collection/import-job-status";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(cleanup);

const DONE = {
  status: "DONE" as const,
  importedCount: 12,
  error: null,
};

describe("ImportJobStatus (#637)", () => {
  it("zeigt nur die Besitz-Anzahl ohne Want-to-Play-Teil", () => {
    render(<ImportJobStatus job={DONE} />);

    expect(
      screen.getByText("Letzter Import: 12 Spiele importiert."),
    ).toBeInTheDocument();
  });

  it("nennt die Anzahl der übernommenen Want-to-Play-Titel", () => {
    render(<ImportJobStatus job={{ ...DONE, wantToPlayCount: 5 }} />);

    expect(
      screen.getByText("Letzter Import: 12 Spiele importiert, 5 Want to Play."),
    ).toBeInTheDocument();
  });

  it("zeigt einen Teilfehler, ohne den Import als fehlgeschlagen zu melden", () => {
    render(
      <ImportJobStatus
        job={{ ...DONE, wantToPlayError: "BGG nicht erreichbar" }}
      />,
    );

    expect(
      screen.getByText("Want to Play nicht importiert: BGG nicht erreichbar"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/fehlgeschlagen/)).toBeNull();
  });
});
