import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivateCollectionCard } from "@/components/feature/profil/private-collection-card";
import type { OwnPrivateCollectionEntry } from "@/lib/ludothek/private-collection";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/ludothek/private-collection-sync", () => ({
  syncPrivateBggCollection: vi.fn(),
}));

function entry(
  overrides: Partial<OwnPrivateCollectionEntry> = {},
): OwnPrivateCollectionEntry {
  return {
    id: "entry-1",
    rating: null,
    forTrade: false,
    wantToPlay: false,
    boardGame: { slug: "ark-nova", title: "Ark Nova", imageUrl: null },
    ...overrides,
  };
}

describe("PrivateCollectionCard (#308)", () => {
  it("links each title to its Ludothek detail page, with a link icon", async () => {
    const user = userEvent.setup();
    render(
      <PrivateCollectionCard
        bggUsername={null}
        entries={[entry()]}
        cooldownEndsAt={null}
        canForceImport={false}
        visibleToOthers={true}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Aus BGG importiert/ }),
    );

    const link = screen.getByRole("link", { name: /Ark Nova/ });
    expect(link).toHaveAttribute("href", "/ludothek/ark-nova");
    expect(link.querySelector("svg")).toBeInTheDocument();
  });
});
