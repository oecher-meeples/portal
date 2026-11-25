import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogTitleView } from "@/components/feature/ludothek/catalog-title-view";

vi.mock("@/components/widgets/contact/meeple-contact-dialog", () => ({
  MeepleContactDialog: ({ name }: { name: string }) => (
    <button type="button">{name}</button>
  ),
}));

afterEach(cleanup);

const BASE = {
  title: "Wunschspiel",
  imageUrl: null,
  yearPublished: 2020,
  averageRating: 7.4,
  bggId: 99,
  wantToPlay: [
    {
      meepleId: "m1",
      name: "Anna",
      profilePictureUrl: null,
      profilePictureVisibility: "INTERN" as const,
    },
  ],
};

describe("CatalogTitleView (#637)", () => {
  it("zeigt Titel, Jahr, BGG-Link, Interessenten und die Aktion", async () => {
    const user = userEvent.setup();
    render(
      <CatalogTitleView
        {...BASE}
        wantToPlayAction={
          <button type="button">Ich will das auch spielen</button>
        }
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Wunschspiel" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /BoardGameGeek/ }),
    ).toHaveAttribute("href", "https://boardgamegeek.com/boardgame/99");
    await user.click(
      screen.getByRole("button", { name: /Meeple möchte das spielen/ }),
    );
    expect(screen.getByRole("button", { name: "Anna" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ich will das auch spielen" }),
    ).toBeInTheDocument();
  });

  it("lässt den BGG-Link ohne BGG-ID weg", () => {
    render(<CatalogTitleView {...BASE} bggId={null} />);
    expect(screen.queryByRole("button", { name: /BoardGameGeek/ })).toBeNull();
  });
});
