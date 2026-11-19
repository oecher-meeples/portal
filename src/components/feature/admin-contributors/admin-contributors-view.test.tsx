import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminContributorsView } from "@/components/feature/admin-contributors/admin-contributors-view";
import type { AdminContributorRow } from "@/lib/ludothek/taxonomy/contributor-admin-queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const mergeContributorsMock = vi.fn();
const deleteContributorMock = vi.fn();
vi.mock("@/lib/ludothek/taxonomy/contributor-admin-actions", () => ({
  mergeContributors: (...args: unknown[]) => mergeContributorsMock(...args),
  deleteContributor: (...args: unknown[]) => deleteContributorMock(...args),
  renameContributor: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ROWS: AdminContributorRow[] = [
  { id: "c1", name: "Kosmos", bggId: 37, roles: ["PUBLISHER"], titleCount: 3 },
  {
    id: "c2",
    name: "Kosmos Verlag",
    bggId: null,
    roles: ["PUBLISHER"],
    titleCount: 1,
  },
  {
    id: "c3",
    name: "Uwe Rosenberg",
    bggId: 10,
    roles: ["AUTHOR"],
    titleCount: 0,
  },
];

describe("AdminContributorsView — Zusammenführen (#520)", () => {
  it("renders the rows without any merge-candidate options", () => {
    const { container } = render(<AdminContributorsView rows={ROWS} />);

    expect(
      screen.getAllByRole("button", { name: "Zusammenführen …" }),
    ).toHaveLength(3);
    // Nur die beiden Filter-Selects (Rolle, Sortierung) — keine Kandidaten.
    expect(container.querySelectorAll("option")).toHaveLength(4 + 2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("picks the target via search in one shared dialog and merges", async () => {
    const user = userEvent.setup();
    mergeContributorsMock.mockResolvedValue({ success: true });
    render(<AdminContributorsView rows={ROWS} />);

    const [, kosmosVerlagRow] = screen.getAllByRole("button", {
      name: "Zusammenführen …",
    });
    await user.click(kosmosVerlagRow);
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("combobox"));
    await user.type(within(dialog).getByRole("combobox"), "Kosmos");
    await user.click(
      await screen.findByRole("option", { name: /^Kosmos \(3 Titel/ }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Zusammenführen" }),
    );

    expect(mergeContributorsMock).toHaveBeenCalledWith("c2", "c1");
  });

  it("shows the action's error in the dialog", async () => {
    const user = userEvent.setup();
    mergeContributorsMock.mockResolvedValue({
      error:
        "Zusammenführen ist nur möglich, wenn höchstens ein Eintrag eine BGG-ID hat.",
    });
    render(<AdminContributorsView rows={ROWS} />);

    await user.click(
      screen.getAllByRole("button", { name: "Zusammenführen …" })[0],
    );
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("combobox"), "Uwe");
    await user.click(
      await screen.findByRole("option", { name: /^Uwe Rosenberg/ }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Zusammenführen" }),
    );

    expect(
      await within(dialog).findByText(/höchstens ein Eintrag/),
    ).toBeVisible();
  });

  it("does not offer the source itself as a target", async () => {
    const user = userEvent.setup();
    render(<AdminContributorsView rows={ROWS} />);

    await user.click(
      screen.getAllByRole("button", { name: "Zusammenführen …" })[0],
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox"));

    expect(
      screen.queryByRole("option", { name: /^Kosmos \(3 Titel/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /^Kosmos Verlag/ }),
    ).toBeInTheDocument();
  });
});
