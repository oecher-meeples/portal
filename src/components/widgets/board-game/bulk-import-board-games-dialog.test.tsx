import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkImportBoardGamesDialog } from "@/components/widgets/board-game/bulk-import-board-games-dialog";

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

const bulkImportBoardGamesMock = vi.fn();
const resolveBulkImportCandidateMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bulk-import", () => ({
  bulkImportBoardGames: (...args: unknown[]) =>
    bulkImportBoardGamesMock(...args),
  resolveBulkImportCandidate: (...args: unknown[]) =>
    resolveBulkImportCandidateMock(...args),
}));

let simulateDetect: ((text: string) => void) | null = null;
vi.mock("@/components/ui/code-scanner", () => ({
  CodeScanner: ({ onDetected }: { onDetected: (text: string) => void }) => {
    simulateDetect = onDetected;
    return null;
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Massenimport/ }));
}

describe("BulkImportBoardGamesDialog", () => {
  it("splits the textarea into one name per line and groups the results into sections", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "imported",
          bggId: 342942,
          title: "Ark Nova",
          slug: "ark-nova",
        },
        {
          name: "Unbekanntes Spiel",
          status: "needs-review",
          candidates: [],
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);

    await user.type(
      screen.getByLabelText("Spieletitel oder EAN"),
      "Ark Nova\nUnbekanntes Spiel",
    );
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(bulkImportBoardGamesMock).toHaveBeenCalledWith([
      "Ark Nova",
      "Unbekanntes Spiel",
    ]);
    expect(
      await screen.findByRole("button", { name: "Erfolgreich importiert 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nicht importiert 1" }),
    ).toBeInTheDocument();
    // "Nicht importiert" is open by default — its row is visible right away.
    expect(screen.getByText("Unbekanntes Spiel")).toBeInTheDocument();
    expect(
      screen.getByText("Nicht eindeutig — bitte manuell prüfen"),
    ).toBeInTheDocument();
    expect(routerRefreshMock).toHaveBeenCalled();
  });

  it("keeps 'Erfolgreich importiert' and 'Bereits vorhanden' collapsed by default", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "imported",
          bggId: 342942,
          title: "Ark Nova",
          slug: "ark-nova",
        },
        {
          name: "Catan",
          status: "skipped-duplicate",
          bggId: 13,
          title: "Catan",
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(
      screen.getByLabelText("Spieletitel oder EAN"),
      "Ark Nova\nCatan",
    );
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    await screen.findByRole("button", { name: "Erfolgreich importiert 1" });
    expect(screen.queryByText("Ark Nova")).not.toBeInTheDocument();
    expect(screen.queryByText("Catan")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Erfolgreich importiert 1" }),
    );
    expect(await screen.findByText("Ark Nova")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Bereits vorhanden 1" }),
    );
    expect(await screen.findByText("Catan")).toBeInTheDocument();
  });

  it("shows BGG-ID and 'Eingegeben als' beside the title for a duplicate, in a compact list", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "DorfRomantik: Das Brettspiel",
          status: "skipped-duplicate",
          bggId: 370591,
          title: "Dorfromantik: The Board Game",
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(
      screen.getByLabelText("Spieletitel oder EAN"),
      "DorfRomantik: Das Brettspiel",
    );
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    await user.click(
      await screen.findByRole("button", { name: "Bereits vorhanden 1" }),
    );

    expect(
      await screen.findByText("Dorfromantik: The Board Game"),
    ).toBeInTheDocument();
    expect(screen.getByText("BGG-ID 370591")).toBeInTheDocument();
    expect(
      screen.getByText("Eingegeben als: DorfRomantik: Das Brettspiel"),
    ).toBeInTheDocument();
  });

  it("links each imported title to its Ludothek detail page in a new tab", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "imported",
          bggId: 342942,
          title: "Ark Nova",
          slug: "ark-nova",
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel oder EAN"), "Ark Nova");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    await user.click(
      await screen.findByRole("button", { name: "Erfolgreich importiert 1" }),
    );
    // Base UI's Button forces role="button" even when composed as an <a>
    // via `render` (see game-detail-view.tsx's BGG link for the same
    // pattern) — query by that role, not "link".
    const link = await screen.findByRole("button", {
      name: "Ark Nova in der Ludothek öffnen",
    });
    expect(link).toHaveAttribute("href", "/ludothek/ark-nova");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("lists the ambiguous candidates for a needs-review row", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Catan",
          status: "needs-review",
          candidates: [
            { bggId: 1, title: "Catan", yearPublished: 1995 },
            { bggId: 2, title: "Catan (Neuauflage)", yearPublished: 2015 },
          ],
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel oder EAN"), "Catan");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(await screen.findByText(/BGG-ID 1/)).toBeInTheDocument();
    expect(screen.getByText(/BGG-ID 2/)).toBeInTheDocument();
  });

  it("shows the failure reason for a failed row", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "failed",
          error: "BoardGameGeek ist aktuell nicht erreichbar.",
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel oder EAN"), "Ark Nova");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(
      await screen.findByText("BoardGameGeek ist aktuell nicht erreichbar."),
    ).toBeInTheDocument();
  });

  it("shows the matched candidate as a correction suggestion on a failed row", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "failed",
          error: "Bitte einen Titel angeben.",
          candidates: [
            { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
          ],
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel oder EAN"), "Ark Nova");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(
      await screen.findByText("Auswahl zur Korrektur:"),
    ).toBeInTheDocument();
    expect(screen.getByText(/BGG-ID 342942/)).toBeInTheDocument();
  });

  it("resolves a candidate in place when the admin picks 'Übernehmen'", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Catan",
          status: "needs-review",
          candidates: [
            { bggId: 1, title: "Catan", yearPublished: 1995 },
            { bggId: 2, title: "Catan (Neuauflage)", yearPublished: 2015 },
          ],
        },
      ],
    });
    resolveBulkImportCandidateMock.mockResolvedValue({
      name: "Catan",
      status: "imported",
      bggId: 2,
      title: "Catan (Neuauflage)",
      slug: "catan-neuauflage",
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel oder EAN"), "Catan");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    const candidateRow = (await screen.findByText(/BGG-ID 2/)).closest("div");
    await user.click(
      within(candidateRow!).getByRole("button", { name: "Übernehmen" }),
    );

    expect(resolveBulkImportCandidateMock).toHaveBeenCalledWith("Catan", 2);
    expect(
      await screen.findByRole("button", { name: "Erfolgreich importiert 1" }),
    ).toBeInTheDocument();
    expect(routerRefreshMock).toHaveBeenCalled();
  });

  it("shows a speaking error instead of results when the whole run fails", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      error: "Keine Berechtigung.",
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel oder EAN"), "Ark Nova");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(await screen.findByText("Keine Berechtigung.")).toBeInTheDocument();
  });

  it("disables the import button while the textarea is empty", async () => {
    const user = userEvent.setup();
    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);

    expect(screen.getByRole("button", { name: "Importieren" })).toBeDisabled();
  });

  it("shows what an EAN entry was resolved to on a review/failed row", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "4001504311896",
          status: "needs-review",
          candidates: [],
          searchedTitle: "Mehrdeutiger Titel",
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(
      screen.getByLabelText("Spieletitel oder EAN"),
      "4001504311896",
    );
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(
      await screen.findByText("Gesucht als: Mehrdeutiger Titel"),
    ).toBeInTheDocument();
  });

  it("makes the textarea read-only and shows a loading indicator while importing", async () => {
    const user = userEvent.setup();
    let resolveImport: (value: unknown) => void = () => {};
    bulkImportBoardGamesMock.mockReturnValue(
      new Promise((resolve) => {
        resolveImport = resolve;
      }),
    );

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel oder EAN"), "Ark Nova");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(screen.getByLabelText("Spieletitel oder EAN")).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByText("Importiere …")).toBeInTheDocument();

    await act(async () => {
      resolveImport({ success: true, results: [] });
    });

    // Der Dialog hat seit der deutschsprachigen Beschriftung des generischen
    // "X"-Schließen-Buttons (`ui/dialog.tsx`) zwei gleichnamige "Schließen"-
    // Buttons — auf den Footer-Button scopen, um den hier gemeinten (der erst
    // nach Abschluss des Imports erscheint) eindeutig zu treffen.
    const footer = document.querySelector('[data-slot="dialog-footer"]');
    expect(footer).not.toBeNull();
    expect(
      await within(footer as HTMLElement).findByRole("button", {
        name: "Schließen",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Importiere …")).not.toBeInTheDocument();
  });

  describe("Scannen (#186-Folge)", () => {
    it("appends each scanned code to the textarea", async () => {
      const user = userEvent.setup();
      render(<BulkImportBoardGamesDialog />);
      await openDialog(user);

      await user.click(screen.getByRole("button", { name: "Scannen" }));
      act(() => simulateDetect?.("4001504311896"));
      act(() => simulateDetect?.("4260402312019"));

      expect(screen.getByLabelText("Spieletitel oder EAN")).toHaveValue(
        "4001504311896\n4260402312019",
      );
    });

    it("doesn't add the same code twice", async () => {
      const user = userEvent.setup();
      render(<BulkImportBoardGamesDialog />);
      await openDialog(user);

      await user.click(screen.getByRole("button", { name: "Scannen" }));
      act(() => simulateDetect?.("4001504311896"));
      act(() => simulateDetect?.("4001504311896"));

      expect(screen.getByLabelText("Spieletitel oder EAN")).toHaveValue(
        "4001504311896",
      );
    });
  });

  describe("CSV hochladen (#186-Folge)", () => {
    it("parses the uploaded file and appends its entries", async () => {
      const user = userEvent.setup();
      render(<BulkImportBoardGamesDialog />);
      await openDialog(user);

      await user.type(
        screen.getByLabelText("Spieletitel oder EAN"),
        "Ark Nova",
      );

      const file = new File(["Titel,EAN\nWingspan,4260402312019"], "bulk.csv", {
        type: "text/csv",
      });
      const input = document.getElementById(
        "bulk-import-csv",
      ) as HTMLInputElement;
      await user.upload(input, file);

      expect(await screen.findByLabelText("Spieletitel oder EAN")).toHaveValue(
        "Ark Nova\nWingspan\n4260402312019",
      );
    });
  });
});
