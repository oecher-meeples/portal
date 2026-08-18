import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardGameKind, LanguageDependence } from "@prisma/client";
import { BggComparePanel } from "@/components/widgets/board-game/bgg-compare-panel";
import type { BggGameData } from "@/lib/bgg/client";

afterEach(() => {
  cleanup();
});

const BGG_DATA: BggGameData = {
  title: "Ark Nova",
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 150,
  weight: 3.7,
  imageUrl: "https://cf.geekdo-images.com/full.jpg",
  description: "Baue einen modernen Zoo.",
  mechanics: ["Kartenspiel", "Engine-Building"],
  kind: BoardGameKind.BOARDGAME,
  languageDependence: LanguageDependence.MODERATE_TEXT,
  author: [],
  yearPublished: null,
  versions: [],
  alternateNames: [],
  explainerVideoUrl: null,
  germanExplainerVideos: [],
  englishExplainerVideos: [],
};

describe("BggComparePanel", () => {
  it("shows every comparable BGG value", () => {
    render(<BggComparePanel bggData={BGG_DATA} onChange={vi.fn()} />);

    expect(screen.getByText("Ark Nova")).toBeInTheDocument();
    expect(screen.getByText("Baue einen modernen Zoo.")).toBeInTheDocument();
    expect(
      screen.getByText("Kartenspiel, Engine-Building"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("https://cf.geekdo-images.com/full.jpg"),
    ).toBeInTheDocument();
  });

  it("shows a dash for fields BGG has no value for", () => {
    render(
      <BggComparePanel
        bggData={{ ...BGG_DATA, minPlayers: null, description: null }}
        onChange={vi.fn()}
      />,
    );

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("applies the title via its Übernehmen button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BggComparePanel bggData={BGG_DATA} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Titel übernehmen" }));

    expect(onChange).toHaveBeenCalledWith({ title: "Ark Nova" });
  });

  it("applies mechanics as a formatted, comma-separated string", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BggComparePanel bggData={BGG_DATA} onChange={onChange} />);

    await user.click(
      screen.getByRole("button", { name: "Mechaniken übernehmen" }),
    );

    expect(onChange).toHaveBeenCalledWith({
      mechanics: "Kartenspiel, Engine-Building",
    });
  });

  it("applies numeric fields as strings", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BggComparePanel bggData={BGG_DATA} onChange={onChange} />);

    await user.click(
      screen.getByRole("button", { name: "Spieler von übernehmen" }),
    );

    expect(onChange).toHaveBeenCalledWith({ minPlayers: "1" });
  });

  it("shows and applies the kind (Art) BGG reports (#202)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BggComparePanel
        bggData={{ ...BGG_DATA, kind: BoardGameKind.BOARDGAME_EXPANSION }}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("Erweiterung")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Art übernehmen" }));

    expect(onChange).toHaveBeenCalledWith({
      kind: BoardGameKind.BOARDGAME_EXPANSION,
    });
  });

  it("shows and applies the language dependence BGG reports (#188)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BggComparePanel bggData={BGG_DATA} onChange={onChange} />);

    expect(
      screen.getByText("Mäßig viel Text – Spickzettel oder Aufkleber nötig"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Sprachabhängigkeit übernehmen" }),
    );

    expect(onChange).toHaveBeenCalledWith({
      languageDependence: LanguageDependence.MODERATE_TEXT,
    });
  });

  it("shows a dash when BGG has no language dependence poll result", () => {
    render(
      <BggComparePanel
        bggData={{ ...BGG_DATA, languageDependence: null }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
