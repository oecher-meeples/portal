import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  goNext,
  openDialog,
  submitBggInput,
  submitButton,
} from "@/components/widgets/board-game/create-board-game-dialog.test-helpers";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const createBoardGameMock = vi.fn();
const findDuplicateBoardGameMock = vi.fn();
vi.mock("@/lib/ludothek/board-games", () => ({
  createBoardGame: (...args: unknown[]) => createBoardGameMock(...args),
  findDuplicateBoardGame: (...args: unknown[]) =>
    findDuplicateBoardGameMock(...args),
}));

const previewBggImportMock = vi.fn();
const searchBggGamesActionMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  previewBggImport: (...args: unknown[]) => previewBggImportMock(...args),
  searchBggGamesAction: (...args: unknown[]) =>
    searchBggGamesActionMock(...args),
}));

vi.mock("@/lib/ludothek/ean-search", () => ({
  searchEanForBoardGame: vi
    .fn()
    .mockResolvedValue({ success: true, results: [] }),
}));

vi.mock("@/lib/ludothek/game-copies", () => ({
  createGameCopy: vi.fn(),
}));

vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: () => null,
}));
vi.mock(
  "@/components/widgets/board-game/create-board-game-location-field",
  () => ({
    CreateBoardGameLocationField: () => null,
  }),
);

beforeEach(() => {
  // No duplicate here — that's covered by create-board-game-dialog.duplicate.test.tsx.
  findDuplicateBoardGameMock.mockResolvedValue(null);
});

const { CreateBoardGameDialog } = await import("./create-board-game-dialog");

describe("CreateBoardGameDialog — BGG-Import: numerische BGG-ID", () => {
  it("imports directly, prefills the review step and submits the enriched data", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: {
        title: "Ark Nova",
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        weight: 3.7,
        imageUrl: "https://example.com/ark-nova.png",
        description: "Zoo-Aufbauspiel",
        mechanics: ["Engine Building"],
        explainerVideoUrl: null,
        germanExplainerVideos: [],
        englishExplainerVideos: [],
      },
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      id: "game-2",
      hint: undefined,
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(dialog, user, "342942");

    await waitFor(() =>
      expect(previewBggImportMock).toHaveBeenCalledWith(342942),
    );
    expect(searchBggGamesActionMock).not.toHaveBeenCalled();
    expect(await within(dialog).findByText("Ark Nova")).toBeInTheDocument();

    await goNext(dialog, user);
    expect(within(dialog).getByLabelText("Titel")).toHaveValue("Ark Nova");

    await goNext(dialog, user);
    await user.click(submitButton(dialog));

    await waitFor(() => expect(createBoardGameMock).toHaveBeenCalledTimes(1));
    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ark Nova",
        bggId: 342942,
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        mechanics: ["Engine Building"],
      }),
    );
  });

  it("resolves the input on Enter, without clicking the Suchen-Button", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: {
        title: "Ark Nova",
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        weight: 3.7,
        imageUrl: "https://example.com/ark-nova.png",
        description: "Zoo-Aufbauspiel",
        mechanics: ["Engine Building"],
        explainerVideoUrl: null,
        germanExplainerVideos: [],
        englishExplainerVideos: [],
      },
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await user.type(
      within(dialog).getByLabelText(/Titel, BGG-Link/),
      "342942{Enter}",
    );

    await waitFor(() =>
      expect(previewBggImportMock).toHaveBeenCalledWith(342942),
    );
  });

  it("falls back to a title search when the numeric BGG-ID is unknown", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: false,
      error: "BoardGameGeek-Eintrag mit ID 999999999 wurde nicht gefunden.",
    });
    searchBggGamesActionMock.mockResolvedValue({
      success: true,
      results: [],
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(dialog, user, "999999999");

    await waitFor(() =>
      expect(previewBggImportMock).toHaveBeenCalledWith(999999999),
    );
    await waitFor(() =>
      expect(searchBggGamesActionMock).toHaveBeenCalledWith("999999999"),
    );
    expect(createBoardGameMock).not.toHaveBeenCalled();
    // No preview was found, so continuing to the review step is blocked.
    expect(
      within(dialog).getByRole("button", { name: "Weiter" }),
    ).toBeDisabled();
  });
});

describe("CreateBoardGameDialog — BGG-Import: BGG-Link", () => {
  it("extracts the thing id from a pasted BGG link and imports directly", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: {
        title: "Ark Nova",
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        weight: 3.7,
        imageUrl: null,
        description: null,
        mechanics: [],
        explainerVideoUrl: null,
        germanExplainerVideos: [],
        englishExplainerVideos: [],
      },
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(
      dialog,
      user,
      "https://boardgamegeek.com/boardgame/342942/ark-nova",
    );

    await waitFor(() =>
      expect(previewBggImportMock).toHaveBeenCalledWith(342942),
    );
    expect(searchBggGamesActionMock).not.toHaveBeenCalled();

    await goNext(dialog, user);
    expect(within(dialog).getByLabelText("Titel")).toHaveValue("Ark Nova");
  });

  it("shows a speaking error and never falls back to a title search for an unknown link", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: false,
      error: "BoardGameGeek-Eintrag mit ID 999999999 wurde nicht gefunden.",
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(
      dialog,
      user,
      "https://boardgamegeek.com/boardgame/999999999/unbekannt",
    );

    expect(
      await within(dialog).findByText(
        "BoardGameGeek-Eintrag mit ID 999999999 wurde nicht gefunden.",
      ),
    ).toBeInTheDocument();
    expect(searchBggGamesActionMock).not.toHaveBeenCalled();
    expect(createBoardGameMock).not.toHaveBeenCalled();
  });
});

describe("CreateBoardGameDialog — BGG-Import: Namenssuche (Fallback)", () => {
  it("searches by title, shows a result list, loads the preview on selection and submits", async () => {
    const user = userEvent.setup();
    searchBggGamesActionMock.mockResolvedValue({
      success: true,
      results: [
        { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
        { bggId: 12345, title: "Ark Nova: Marschmoor", yearPublished: 2023 },
      ],
    });
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: {
        title: "Ark Nova",
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        weight: 3.7,
        imageUrl: null,
        description: null,
        mechanics: [],
        explainerVideoUrl: null,
        germanExplainerVideos: [],
        englishExplainerVideos: [],
      },
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      id: "game-3",
      hint: undefined,
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(dialog, user, "Ark Nova");

    await waitFor(() =>
      expect(searchBggGamesActionMock).toHaveBeenCalledWith("Ark Nova"),
    );
    expect(previewBggImportMock).not.toHaveBeenCalled();
    expect(
      await within(dialog).findByText("Ark Nova: Marschmoor", {
        exact: false,
      }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Ark Nova(2021)" }),
    );

    await waitFor(() =>
      expect(previewBggImportMock).toHaveBeenCalledWith(342942),
    );

    await goNext(dialog, user);
    expect(within(dialog).getByLabelText("Titel")).toHaveValue("Ark Nova");

    await goNext(dialog, user);
    await user.click(submitButton(dialog));

    await waitFor(() => expect(createBoardGameMock).toHaveBeenCalledTimes(1));
    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Ark Nova", bggId: 342942 }),
    );
  });

  it("shows a hint when the search returns no hits", async () => {
    const user = userEvent.setup();
    searchBggGamesActionMock.mockResolvedValue({
      success: true,
      results: [],
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(dialog, user, "kein-treffer-xyz");

    expect(
      await within(dialog).findByText(
        "Keine Treffer auf BoardGameGeek gefunden.",
      ),
    ).toBeInTheDocument();
  });
});

describe("CreateBoardGameDialog — Regelvideo-Auswahl (#185)", () => {
  it("leaves the video field empty until the admin picks from multiple German matches", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: {
        title: "Ark Nova",
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        weight: 3.7,
        imageUrl: null,
        description: null,
        mechanics: [],
        explainerVideoUrl: "https://www.youtube.com/watch?v=english-fallback",
        germanExplainerVideos: [
          {
            title: "Regeln auf Deutsch",
            url: "https://www.youtube.com/watch?v=german1",
            channel: "ChannelA",
          },
          {
            title: "Ausführliche Regelerklärung",
            url: "https://www.youtube.com/watch?v=german2",
            channel: "ChannelB",
          },
        ],
      },
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(dialog, user, "342942");

    expect(
      await within(dialog).findByText("Regeln auf Deutsch", {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Ausführliche Regelerklärung", {
        exact: false,
      }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", {
        name: /Ausführliche Regelerklärung/,
      }),
    );

    await goNext(dialog, user);
    expect(
      within(dialog).getByLabelText("Erklärvideo (YouTube-Link)"),
    ).toHaveValue("https://www.youtube.com/watch?v=german2");
  });

  it("falls back to the first instructional video when no German match exists", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: {
        title: "Ark Nova",
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        weight: 3.7,
        imageUrl: null,
        description: null,
        mechanics: [],
        explainerVideoUrl: "https://www.youtube.com/watch?v=english-fallback",
        germanExplainerVideos: [],
        englishExplainerVideos: [],
      },
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(dialog, user, "342942");
    await waitFor(() =>
      expect(previewBggImportMock).toHaveBeenCalledWith(342942),
    );

    expect(
      within(dialog).queryByText("Deutschsprachiges Regelvideo auswählen"),
    ).not.toBeInTheDocument();

    await goNext(dialog, user);
    expect(
      within(dialog).getByLabelText("Erklärvideo (YouTube-Link)"),
    ).toHaveValue("https://www.youtube.com/watch?v=english-fallback");
  });
});
