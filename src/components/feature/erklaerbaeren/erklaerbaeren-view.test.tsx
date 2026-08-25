import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/explainer/actions", () => ({
  addExplainerGame: vi.fn(),
  updateExplainerGameLevel: vi.fn(),
  removeExplainerGame: vi.fn(),
}));

const { ErklaerbaerenView } = await import("./erklaerbaeren-view");

const DIRECTORY = [
  {
    boardGameId: "game-1",
    boardGameTitle: "Arche Nova",
    explainers: [
      {
        meepleId: "meeple-1",
        displayName: "Anna",
        level: "WITH_MANUAL" as const,
      },
    ],
  },
];

describe("ErklaerbaerenView — Verzeichnis nur für Admins (#210)", () => {
  it("hides the full directory section for a non-admin Meeple", () => {
    render(
      <ErklaerbaerenView
        directory={DIRECTORY}
        myGames={[]}
        availableGames={[]}
        isAdmin={false}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "Erklärbären-Verzeichnis" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Das kann ich erklären:" }),
    ).toBeInTheDocument();
  });

  it("shows the full directory section for an admin", async () => {
    const user = userEvent.setup();
    render(
      <ErklaerbaerenView
        directory={DIRECTORY}
        myGames={[]}
        availableGames={[]}
        isAdmin={true}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Erklärbären-Verzeichnis" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Erklärbären-Verzeichnis" }),
    );

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
  });
});
