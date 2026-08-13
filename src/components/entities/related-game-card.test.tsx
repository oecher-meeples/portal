import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RelatedGameCard } from "@/components/entities/related-game-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

const GAME = {
  id: "game-2",
  title: "Wingspan: Oceania",
  slug: "wingspan-oceania",
  imageUrl: null,
};

describe("RelatedGameCard", () => {
  it("links to the title's detail page", () => {
    render(<RelatedGameCard game={GAME} />);

    expect(
      screen.getByRole("link", { name: /Wingspan: Oceania/ }),
    ).toHaveAttribute("href", "/ludothek/wingspan-oceania");
  });

  it("shows the location chain when set (internal viewers)", () => {
    render(<RelatedGameCard game={GAME} locationChain="Regal A" />);

    expect(screen.getByText("Regal A")).toBeInTheDocument();
  });

  it("omits the location line entirely when not passed (guests)", () => {
    render(<RelatedGameCard game={GAME} />);

    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText("Regal A")).not.toBeInTheDocument();
  });

  it("shows no remove button without a removeAction", () => {
    render(<RelatedGameCard game={GAME} />);

    expect(
      screen.queryByRole("button", { name: /Entfernen/ }),
    ).not.toBeInTheDocument();
  });

  it("confirms and runs removeAction when set", () => {
    const removeAction = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<RelatedGameCard game={GAME} removeAction={removeAction} />);

    fireEvent.click(screen.getByRole("button", { name: /Entfernen/ }));

    expect(window.confirm).toHaveBeenCalledWith(
      '"Wingspan: Oceania" wirklich entfernen?',
    );
    expect(removeAction).toHaveBeenCalled();
  });
});
