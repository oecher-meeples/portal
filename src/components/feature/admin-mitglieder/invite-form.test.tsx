import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { InviteForm } from "@/components/feature/admin-mitglieder/invite-form";

vi.mock("@/components/feature/admin-mitglieder/invite-actions", () => ({
  createInvite: vi.fn(),
}));

afterEach(cleanup);

// #451: die Combobox darf nicht deaktivieren, nur weil aktuell alle
// verbleibenden Mitglieder bereits eine offene Einladung haben — das Feld
// bleibt editierbar, egal wie viele Treffer die Suche liefert.
describe("InviteForm — Suchfeld bleibt editierbar (#451)", () => {
  it("keeps the search input enabled even when membersWithoutLogin is empty", () => {
    render(<InviteForm membersWithoutLogin={[]} defaultDays={7} />);

    expect(screen.getByLabelText("Mitglied")).toBeEnabled();
  });

  it("keeps the search input enabled with a non-empty list too", () => {
    render(
      <InviteForm
        membersWithoutLogin={[
          {
            id: "member-1",
            memberNumber: 1,
            displayName: "Erika Muster",
            email: "erika@example.com",
          },
        ]}
        defaultDays={7}
      />,
    );

    expect(screen.getByLabelText("Mitglied")).toBeEnabled();
  });
});
