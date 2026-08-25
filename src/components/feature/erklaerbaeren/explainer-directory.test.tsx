import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { ExplainerDirectory } = await import("./explainer-directory");

afterEach(() => {
  cleanup();
});

const ENTRIES = [
  {
    boardGameId: "game-1",
    boardGameTitle: "Arche Nova",
    explainers: [
      { meepleId: "m-1", displayName: "Anna", level: "WITH_MANUAL" as const },
    ],
  },
  {
    boardGameId: "game-2",
    boardGameTitle: "Wingspan",
    explainers: [],
  },
];

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Erklärbären-Verzeichnis" }),
  );
}

describe("ExplainerDirectory — Akkordeon, Filter & Switch (#210)", () => {
  it("is collapsed by default", () => {
    render(<ExplainerDirectory entries={ENTRIES} />);

    expect(screen.queryByText("Arche Nova")).not.toBeInTheDocument();
  });

  it("hides games without an Erklärbär by default once expanded", async () => {
    const user = userEvent.setup();
    render(<ExplainerDirectory entries={ENTRIES} />);
    await open(user);

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(screen.queryByText("Wingspan")).not.toBeInTheDocument();
  });

  it("shows games without an Erklärbär once the switch is toggled on", async () => {
    const user = userEvent.setup();
    render(<ExplainerDirectory entries={ENTRIES} />);
    await open(user);

    await user.click(
      screen.getByRole("switch", { name: "Spiele ohne Erklärer anzeigen?" }),
    );

    expect(screen.getByText("Wingspan")).toBeInTheDocument();
  });

  it("filters by title", async () => {
    const user = userEvent.setup();
    render(<ExplainerDirectory entries={ENTRIES} />);
    await open(user);

    await user.type(screen.getByLabelText("Spieltitel filtern"), "arche");

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(screen.queryByText("Wingspan")).not.toBeInTheDocument();
  });

  it("shows the explainer count as a badge", async () => {
    const user = userEvent.setup();
    render(<ExplainerDirectory entries={ENTRIES} />);
    await open(user);

    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
