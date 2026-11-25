import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SharedCollectionMeeplesCard } from "@/components/feature/ludothek/shared-collection-meeples-card";

vi.mock("@/components/widgets/contact/meeple-contact-dialog", () => ({
  MeepleContactDialog: ({ name }: { name: string }) => (
    <button type="button">{name}</button>
  ),
}));

afterEach(cleanup);

const LABELS = {
  singularLabel: "Meeple möchte das spielen",
  pluralLabel: "Meeple möchten das spielen",
};

const meeple = (id: string, name: string) => ({
  meepleId: id,
  name,
  profilePictureUrl: null,
  profilePictureVisibility: "INTERN" as const,
});

describe("SharedCollectionMeeplesCard (#632-Folge)", () => {
  it("renders nothing without meeples", () => {
    const { container } = render(
      <SharedCollectionMeeplesCard {...LABELS} meeples={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("can render without meeples to offer the first action", () => {
    render(
      <SharedCollectionMeeplesCard
        {...LABELS}
        meeples={[]}
        showWhenEmpty
        action={<button type="button">Ich will das auch spielen</button>}
      />,
    );
    expect(screen.getByText("Meeple möchten das spielen")).toBeInTheDocument();
  });

  it("uses the singular for one meeple", () => {
    render(
      <SharedCollectionMeeplesCard
        {...LABELS}
        meeples={[meeple("1", "Anna")]}
      />,
    );
    expect(screen.getByText("Meeple möchte das spielen")).toBeInTheDocument();
  });

  it("shows the count and lists names after expanding", async () => {
    const user = userEvent.setup();
    render(
      <SharedCollectionMeeplesCard
        {...LABELS}
        meeples={[meeple("1", "Anna"), meeple("2", "Zoe")]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /2\s*Meeple möchten das spielen/ }),
    );

    expect(screen.getByRole("button", { name: "Anna" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoe" })).toBeInTheDocument();
  });
});
