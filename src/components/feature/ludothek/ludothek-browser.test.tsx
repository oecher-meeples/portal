import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: vi.fn(),
  hasPermission: vi.fn(),
}));
const routerReplaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: vi.fn() }),
}));
vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: ({ onScanned }: { onScanned: (text: string) => void }) => (
    <button type="button" onClick={() => onScanned("4001504311892")}>
      simulate-scan
    </button>
  ),
}));

const { LudothekBrowser } = await import("./ludothek-browser");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const PRIVATE_RESULT = {
  id: "entry-1",
  title: "Dune: Imperium",
  imageUrl: null,
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 60,
  ownerMeepleId: "meeple-1",
  ownerDisplayName: "Lea Demo",
};

function baseProps() {
  return {
    games: [],
    basePath: "/ludothek",
    rawSearchParams: {},
    filters: {},
    mechanicsOptions: [],
  };
}

describe("LudothekBrowser — private collection leak prevention", () => {
  it("never renders private collection results in the guest (public) view, even if passed by mistake", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal={false}
        privateCollectionResults={[PRIVATE_RESULT]}
      />,
    );

    expect(screen.queryByText("Dune: Imperium")).not.toBeInTheDocument();
    expect(screen.queryByText(/im Privatbesitz von/)).not.toBeInTheDocument();
  });

  it("renders nothing when the toggle is off, even internally", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal
        filters={{ showPrivateCollection: false }}
        privateCollectionResults={[PRIVATE_RESULT]}
      />,
    );

    expect(screen.queryByText("Dune: Imperium")).not.toBeInTheDocument();
  });

  it("renders the owner hint when internal and the toggle is on", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal
        filters={{ showPrivateCollection: true }}
        privateCollectionResults={[PRIVATE_RESULT]}
      />,
    );

    expect(screen.getByText("Dune: Imperium")).toBeInTheDocument();
    expect(
      screen.getByText(/im Privatbesitz von Lea Demo/),
    ).toBeInTheDocument();
  });
});

describe("LudothekBrowser — live search", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates the q search param after the debounce delay while typing", () => {
    vi.useFakeTimers();
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    const input = screen.getByPlaceholderText("Spiel, EAN oder BGG-ID suchen …");
    fireEvent.change(input, { target: { value: "arche" } });
    expect(routerReplaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek?q=arche");
  });

  it.each([false, true])(
    "has no link to /scan and a scan sets q instead (internal=%s)",
    (internal) => {
      vi.useFakeTimers();
      render(<LudothekBrowser {...baseProps()} internal={internal} />);

      expect(screen.queryByRole("link", { name: /Scannen/ })).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("simulate-scan"));
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(routerReplaceMock).toHaveBeenCalledWith(
        "/ludothek?q=4001504311892",
      );
    },
  );
});
