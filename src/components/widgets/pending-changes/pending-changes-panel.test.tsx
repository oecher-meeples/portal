import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PendingChangesPanel } from "@/components/widgets/pending-changes/pending-changes-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/members/pending-change-actions", () => ({
  approvePendingChange: vi.fn(),
  rejectPendingChange: vi.fn(),
  checkOpenInviteBeforeApproval: vi.fn(),
}));

afterEach(cleanup);

function change(id: string) {
  return {
    id,
    memberDisplayName: "Erika Muster",
    memberNumber: 1,
    memberSlug: "erika-muster",
    displayValue: "Neuer Wert",
    requestedAt: new Date("2026-08-01").toISOString(),
    confirmed: true,
  };
}

describe("PendingChangesPanel — Singular/Plural-Titel (#416)", () => {
  it("renders nothing without any open change", () => {
    const { container } = render(
      <PendingChangesPanel
        titleSingular="Offener Änderungsantrag"
        titlePlural="Offene Änderungsanträge"
        changes={[]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the singular title for exactly one open change", () => {
    render(
      <PendingChangesPanel
        titleSingular="Offener Änderungsantrag"
        titlePlural="Offene Änderungsanträge"
        changes={[change("pc-1")]}
      />,
    );

    expect(screen.getByText("Offener Änderungsantrag")).toBeInTheDocument();
    expect(
      screen.queryByText("Offene Änderungsanträge"),
    ).not.toBeInTheDocument();
  });

  it("shows the plural title for two or more open changes", () => {
    render(
      <PendingChangesPanel
        titleSingular="Offener Änderungsantrag"
        titlePlural="Offene Änderungsanträge"
        changes={[change("pc-1"), change("pc-2")]}
      />,
    );

    expect(screen.getByText("Offene Änderungsanträge")).toBeInTheDocument();
    expect(
      screen.queryByText("Offener Änderungsantrag"),
    ).not.toBeInTheDocument();
  });
});
