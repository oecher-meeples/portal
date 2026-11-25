import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}));

vi.mock("@/lib/explainer/actions", () => ({
  setExplainerWanted: vi.fn(),
  searchBoardGamesAction: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/members/contact-dialog", () => ({
  fetchContactDialogMeeple: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const { DirectoryTab } = await import("./directory-tab");

function entry(id: string, title: string, explainerNames: string[]) {
  return {
    boardGameId: id,
    boardGameTitle: title,
    imageUrl: null,
    bggId: null,
    wanted: false,
    explainers: explainerNames.map((displayName, i) => ({
      meepleId: `m-${id}-${i}`,
      displayName,
      level: "WITH_MANUAL" as const,
      profilePictureUrl: null,
      profilePictureVisibility: "INTERN" as const,
    })),
  };
}

describe("DirectoryTab (#664)", () => {
  it("shows a tile per game with the explainer count as badge", () => {
    render(
      <DirectoryTab
        filter="all"
        query=""
        entries={[
          entry("g1", "Arche Nova", ["Anna", "Ben"]),
          entry("g2", "Azul", ["Cleo"]),
        ]}
      />,
    );

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "2 Erklärbären für Arche Nova ansehen",
      }),
    ).toHaveTextContent("2");
    expect(
      screen.getByRole("button", { name: "1 Erklärbären für Azul ansehen" }),
    ).toHaveTextContent("1");
  });

  it("opens a dialog with all explainers when the badge is clicked", async () => {
    render(
      <DirectoryTab
        filter="all"
        query=""
        entries={[entry("g1", "Arche Nova", ["Anna", "Ben"])]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Erklärbären für Arche Nova/ }),
    );

    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Ben")).toBeInTheDocument();
  });

  it("offers exclusive filter links Alle | Gesucht", () => {
    render(<DirectoryTab filter="all" query="" entries={[]} />);

    expect(screen.getByRole("link", { name: "Alle" })).toHaveAttribute(
      "href",
      "/erklaerbaeren?tab=verzeichnis&filter=alle",
    );
    expect(screen.getByRole("link", { name: "Gesucht" })).toHaveAttribute(
      "href",
      "/erklaerbaeren?tab=verzeichnis&filter=gesucht",
    );
    expect(screen.getByRole("link", { name: "Alle" })).toHaveClass(
      "bg-primary",
    );
  });

  it("writes the debounced title search to the URL", async () => {
    render(<DirectoryTab filter="all" query="" entries={[]} />);

    await userEvent.type(screen.getByPlaceholderText(/Spieltitel/), "azu");

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/erklaerbaeren?tab=verzeichnis&filter=alle&q=azu",
      ),
    );
  });

  it("shows an empty state", () => {
    render(<DirectoryTab filter="all" query="" entries={[]} />);

    expect(
      screen.getByText("Kein Spiel mit Erklärbär gefunden."),
    ).toBeInTheDocument();
  });

  it("has neither remove buttons nor an add button in the Alle filter", () => {
    render(
      <DirectoryTab
        filter="all"
        query=""
        entries={[entry("g1", "Azul", ["Anna"])]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Erklärergesuch/ }),
    ).not.toBeInTheDocument();
  });
});
