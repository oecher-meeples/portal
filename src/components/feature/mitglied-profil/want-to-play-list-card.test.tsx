import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const loadMoreMock = vi.fn();
const removeMock = vi.fn();
const clearMock = vi.fn();
vi.mock(
  "@/components/feature/mitglied-profil/want-to-play-list-actions",
  () => ({
    loadMoreWantToPlayAction: (...args: unknown[]) => loadMoreMock(...args),
    removeWantToPlayEntryAction: (...args: unknown[]) => removeMock(...args),
    clearWantToPlayAction: (...args: unknown[]) => clearMock(...args),
  }),
);

const { WantToPlayListCard } =
  await import("@/components/feature/mitglied-profil/want-to-play-list-card");

let intersect: () => void = () => {};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        intersect = () => cb([{ isIntersecting: true }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const item = (n: number) => ({
  id: `e${n}`,
  boardGameId: `g${n}`,
  slug: `spiel-${n}`,
  title: `Spiel ${n}`,
  imageUrl: null,
});

/** Rendert die Karte und klappt das Akkordeon auf. */
function setup(overrides: Partial<Parameters<typeof WantToPlayListCard>[0]>) {
  const view = render(
    <WantToPlayListCard
      meepleId="m1"
      initialItems={[item(1), item(2)]}
      initialCursor={null}
      total={2}
      isOwner={false}
      {...overrides}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Das möchte ich spielen/ }),
  );
  return view;
}

describe("WantToPlayListCard (#637)", () => {
  it("ist zugeklappt und zeigt nur Titel und Zähler, bis man es aufklappt", () => {
    render(
      <WantToPlayListCard
        meepleId="m1"
        initialItems={[item(1)]}
        initialCursor={null}
        total={1}
        isOwner={false}
      />,
    );

    expect(screen.getByText("Das möchte ich spielen")).toBeInTheDocument();
    expect(screen.queryByText("Spiel 1")).not.toBeInTheDocument();
  });

  it("zeigt anderen Einträge und Zähler, aber keine Entfernen-Bedienelemente", () => {
    setup({});

    expect(screen.getByText("Das möchte ich spielen")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Spiel 1/ })).toHaveAttribute(
      "href",
      "/ludothek/spiel-1",
    );
    expect(
      screen.queryByRole("button", { name: "Alles entfernen" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /entfernen/ })).toBeNull();
  });

  it("zeigt der Besitzerin eine leere Karte mit Erklärung", () => {
    setup({ initialItems: [], total: 0, isOwner: true });

    expect(screen.getByText(/Noch nichts auf der Liste/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Alles entfernen" }),
    ).toBeNull();
  });

  it("blendet einen entfernten Eintrag lokal aus und zählt herunter", async () => {
    removeMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    setup({ isOwner: true });

    await user.click(screen.getByRole("button", { name: "Spiel 1 entfernen" }));

    await waitFor(() =>
      expect(screen.queryByText("Spiel 1")).not.toBeInTheDocument(),
    );
    expect(removeMock).toHaveBeenCalledWith("g1");
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("fragt vor dem Leeren nach und entfernt alle Einträge", async () => {
    clearMock.mockResolvedValue({ success: true });
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    const user = userEvent.setup();
    setup({ isOwner: true });

    await user.click(screen.getByRole("button", { name: "Alles entfernen" }));

    await waitFor(() =>
      expect(screen.queryByText("Spiel 2")).not.toBeInTheDocument(),
    );
    expect(clearMock).toHaveBeenCalled();
  });

  it("lädt beim Scrollen die nächste Seite nach", async () => {
    loadMoreMock.mockResolvedValue({
      success: true,
      items: [item(3)],
      nextCursor: null,
    });
    setup({ initialCursor: { title: "Spiel 2", id: "e2" }, total: 3 });

    intersect();

    await waitFor(() =>
      expect(screen.getByText("Spiel 3")).toBeInTheDocument(),
    );
    expect(loadMoreMock).toHaveBeenCalledWith("m1", {
      cursor: { title: "Spiel 2", id: "e2" },
      query: "",
    });
  });

  it("sucht nach Titel und ersetzt die Liste durch die Treffer", async () => {
    loadMoreMock.mockResolvedValue({
      success: true,
      items: [item(7)],
      nextCursor: null,
    });
    const user = userEvent.setup();
    setup({});

    await user.type(screen.getByPlaceholderText("Titel suchen"), "sieben");

    await waitFor(() =>
      expect(screen.getByText("Spiel 7")).toBeInTheDocument(),
    );
    expect(loadMoreMock).toHaveBeenCalledWith("m1", { query: "sieben" });
    expect(screen.queryByText("Spiel 1")).not.toBeInTheDocument();
  });

  it("zeigt ohne Treffer einen Hinweis", async () => {
    loadMoreMock.mockResolvedValue({
      success: true,
      items: [],
      nextCursor: null,
    });
    const user = userEvent.setup();
    setup({});

    await user.type(screen.getByPlaceholderText("Titel suchen"), "xyz");

    await waitFor(() =>
      expect(screen.getByText("Keine Treffer.")).toBeInTheDocument(),
    );
  });

  it("blendet die Suche bei einer leeren Liste aus", () => {
    setup({ initialItems: [], total: 0, isOwner: true });
    expect(screen.queryByPlaceholderText("Titel suchen")).toBeNull();
  });
});
