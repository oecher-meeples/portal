import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateBoardGameExemplarStep } from "@/components/widgets/board-game/create-board-game-exemplar-step";
import { EMPTY_BOARD_GAME_FORM } from "@/components/widgets/board-game/board-game-form-values";
import type { BggGameData, BggVersion } from "@/lib/bgg/client";

vi.mock("@/lib/ludothek/taxonomy/contributor-actions", () => ({
  listContributorNames: async () => [],
}));
vi.mock("@/lib/ludothek/taxonomy/version-actions", () => ({
  getBoardGameEditions: async () => [],
}));
vi.mock("@/lib/ludothek/ean-search", () => ({
  searchEanForBoardGame: vi
    .fn()
    .mockResolvedValue({ success: true, results: [] }),
}));
vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: () => null,
}));
vi.mock(
  "@/components/widgets/board-game/create-board-game-location-field",
  () => ({ CreateBoardGameLocationField: () => null }),
);

afterEach(() => {
  cleanup();
});

const ENGLISH: BggVersion = {
  bggVersionId: 1,
  name: "English edition",
  yearPublished: 2021,
  publisher: ["Capstone Games"],
  productCode: null,
  languages: ["English"],
  publisherLinks: [],
};
const GERMAN: BggVersion = {
  bggVersionId: 2,
  name: "Deutsche Ausgabe",
  yearPublished: 2022,
  publisher: ["Feuerland Spiele"],
  productCode: "FEU001",
  languages: ["German"],
  publisherLinks: [],
};

const PREVIEW = {
  title: "Ark Nova",
  versions: [ENGLISH, GERMAN],
  alternateNames: [],
} as unknown as BggGameData;

function renderStep(
  overrides: Partial<Parameters<typeof CreateBoardGameExemplarStep>[0]> = {},
) {
  const props = {
    values: { ...EMPTY_BOARD_GAME_FORM, title: "Ark Nova" },
    onChange: vi.fn(),
    onPlacementResolved: vi.fn(),
    placement: null,
    existingBoardGame: null,
    correctingExistingTitle: false,
    preview: PREVIEW,
    onSelectVersion: vi.fn(),
    ...overrides,
  };
  render(<CreateBoardGameExemplarStep {...props} />);
  return props;
}

describe("CreateBoardGameExemplarStep — Version & Exemplar", () => {
  it("offers the BGG versions in the version dropdown, German first", () => {
    renderStep();

    const options = Array.from(
      (screen.getByLabelText("Version") as HTMLSelectElement).options,
    ).map((option) => option.textContent);
    expect(options[0]).toBe("Ohne Version");
    expect(options[1]).toMatch(/Feuerland Spiele/);
    expect(options[2]).toMatch(/Capstone Games/);
    expect(options.at(-1)).toBe("Neue Version manuell eingeben …");
  });

  it("hands the chosen BGG version to the dialog", async () => {
    const user = userEvent.setup();
    const { onSelectVersion } = renderStep();

    await user.selectOptions(
      screen.getByLabelText("Version"),
      screen.getByRole("option", { name: /Feuerland Spiele/ }),
    );

    expect(onSelectVersion).toHaveBeenCalledWith(GERMAN);
  });

  it("switches back to 'Ohne Version' and drops the BGG link", async () => {
    const user = userEvent.setup();
    const { onChange } = renderStep();

    await user.selectOptions(screen.getByLabelText("Version"), "Ohne Version");

    expect(onChange).toHaveBeenCalledWith({
      editionMode: "none",
      editionVersionId: "",
      bggVersion: null,
    });
  });

  it("offers no BGG versions without a preview", () => {
    renderStep({ preview: null });

    expect(
      screen.queryByRole("group", { name: "Versionen auf BGG" }),
    ).not.toBeInTheDocument();
  });

  it("shows the EAN field for a new title", () => {
    renderStep();

    expect(screen.getByLabelText("EAN")).toBeInTheDocument();
  });

  it("hides the EAN field when only adding a copy to an existing title", () => {
    renderStep({
      existingBoardGame: { id: "game-1", title: "Ark Nova" } as never,
    });

    expect(screen.queryByLabelText("EAN")).not.toBeInTheDocument();
  });

  it("does not flag publishers of the chosen BGG version as unknown", async () => {
    renderStep({
      values: {
        ...EMPTY_BOARD_GAME_FORM,
        title: "Ark Nova",
        editionMode: "new",
        publisher: "Feuerland Spiele",
        bggVersion: {
          bggVersionId: 2,
          name: "Deutsche Ausgabe",
          yearPublished: 2022,
          productCode: null,
          publisherLinks: [{ bggId: 10, name: "Feuerland Spiele" }],
        },
      },
    });

    expect(await screen.findByText("Feuerland Spiele")).toBeInTheDocument();
    expect(screen.queryByLabelText("Unbekannter Name")).not.toBeInTheDocument();
  });
});
