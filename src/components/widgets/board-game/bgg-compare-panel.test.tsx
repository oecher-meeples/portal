import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardGameKind, LanguageDependence } from "@prisma/client";
import { BggComparePanel } from "@/components/widgets/board-game/bgg-compare-panel";
import { compareBoardGameWithBgg } from "@/lib/ludothek/board-game-bgg-compare";
import type { BggGameData } from "@/lib/bgg/client";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";

afterEach(() => {
  cleanup();
});

const BGG_DATA: BggGameData = {
  title: "Ark Nova",
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 150,
  weight: 3.7,
  averageRating: 8.5,
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

const FORM: BoardGameFormValues = {
  title: "Arche Nova",
  secondaryTitle: "",
  ean: "",
  condition: "",
  kind: BoardGameKind.BOARDGAME,
  bggId: "342942",
  minPlayers: "1",
  maxPlayers: "4",
  playTimeMinutes: "150",
  weight: "3.7",
  averageRating: "8.5",
  imageUrl: "https://cf.geekdo-images.com/full.jpg",
  description: "Baue einen modernen Zoo.",
  mechanics: "Kartenspiel, Engine-Building",
  explainerVideoUrl: "",
  languageDependence: LanguageDependence.MODERATE_TEXT,
  ruleBookLanguages: [],
  publisher: "",
  author: "",
  yearPublished: "",
};

function renderPanel(
  overrides: {
    form?: BoardGameFormValues;
    bggData?: BggGameData;
    onChange?: (patch: Partial<BoardGameFormValues>) => void;
    onDone?: () => void;
  } = {},
) {
  const form = overrides.form ?? FORM;
  const bggData = overrides.bggData ?? BGG_DATA;
  return render(
    <BggComparePanel
      bggData={bggData}
      form={form}
      compareStatus={compareBoardGameWithBgg(form, bggData)}
      onChange={overrides.onChange ?? vi.fn()}
      onDone={overrides.onDone ?? vi.fn()}
    />,
  );
}

describe("BggComparePanel", () => {
  it("shows only fields that actually differ, not the whole comparison", () => {
    // Only the title differs from FORM here.
    renderPanel();

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(screen.getByText("Ark Nova")).toBeInTheDocument();
    expect(
      screen.queryByText("Baue einen modernen Zoo."),
    ).not.toBeInTheDocument();
  });

  it("says so when nothing differs", () => {
    renderPanel({ bggData: { ...BGG_DATA, title: "Arche Nova" } });

    expect(screen.getByText("Keine Abweichungen mehr.")).toBeInTheDocument();
  });

  it("applies the BGG value and removes the row on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPanel({ onChange });

    await user.click(
      screen.getByRole("button", { name: "Titel: BGG-Wert übernehmen" }),
    );

    expect(onChange).toHaveBeenCalledWith({ title: "Ark Nova" });
    expect(screen.getByText("Keine Abweichungen mehr.")).toBeInTheDocument();
  });

  it("keeps the old value without patching the form, and still removes the row", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPanel({ onChange });

    await user.click(
      screen.getByRole("button", { name: "Titel: bisherigen Wert behalten" }),
    );

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Keine Abweichungen mehr.")).toBeInTheDocument();
  });

  it("shows a dash for fields BGG has no value for", () => {
    renderPanel({ bggData: { ...BGG_DATA, minPlayers: null } });

    expect(
      screen.getByRole("button", { name: "Spieler von: BGG-Wert übernehmen" }),
    ).toHaveTextContent("—");
  });

  it("shows and applies the kind (Art) BGG reports (#202)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPanel({
      bggData: { ...BGG_DATA, kind: BoardGameKind.BOARDGAME_EXPANSION },
      onChange,
    });

    expect(screen.getByText("Erweiterung")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Art: BGG-Wert übernehmen" }),
    );

    expect(onChange).toHaveBeenCalledWith({
      kind: BoardGameKind.BOARDGAME_EXPANSION,
    });
  });

  it("calls onDone when 'Fertig' is clicked", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    renderPanel({ onDone });

    await user.click(screen.getByRole("button", { name: "Fertig" }));

    expect(onDone).toHaveBeenCalled();
  });
});
