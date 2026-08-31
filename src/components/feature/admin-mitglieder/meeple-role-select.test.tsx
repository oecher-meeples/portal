import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeepleRoleSelect } from "@/components/feature/admin-mitglieder/meeple-role-select";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const assignMeepleRoleMock = vi.fn();
const removeMeepleRoleMock = vi.fn();
vi.mock("@/components/feature/admin-mitglieder/actions", () => ({
  assignMeepleRole: (...args: unknown[]) => assignMeepleRoleMock(...args),
  removeMeepleRole: (...args: unknown[]) => removeMeepleRoleMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ROLES = [
  { id: "role-vorstand", name: "Vorstand", isSystemRole: false },
  { id: "role-ausgetreten", name: "Ausgetreten", isSystemRole: true },
];

beforeEach(() => {
  assignMeepleRoleMock.mockResolvedValue({ success: true });
  removeMeepleRoleMock.mockResolvedValue({ success: true });
});

describe("MeepleRoleSelect (#352, #353)", () => {
  it("assigns a plain role without a window for a members:manage-only viewer", async () => {
    const user = userEvent.setup();
    render(
      <MeepleRoleSelect
        meepleId="meeple-1"
        assignments={[]}
        roles={ROLES}
        canManageAdminAccess={false}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: "Vorstand" }),
    );

    expect(assignMeepleRoleMock).toHaveBeenCalledWith(
      "meeple-1",
      "role-vorstand",
      undefined,
    );
  });

  it("hides the Systemrolle from the dropdown for a members:manage-only viewer", () => {
    render(
      <MeepleRoleSelect
        meepleId="meeple-1"
        assignments={[]}
        roles={ROLES}
        canManageAdminAccess={false}
      />,
    );

    expect(
      screen.queryByRole("option", { name: "Ausgetreten" }),
    ).not.toBeInTheDocument();
  });

  it("shows the Amtszeit date fields only with admin:access, and assigns with the given window", async () => {
    const user = userEvent.setup();
    render(
      <MeepleRoleSelect
        meepleId="meeple-1"
        assignments={[]}
        roles={ROLES}
        canManageAdminAccess={true}
      />,
    );

    await user.type(screen.getByLabelText("Amtszeit-Start"), "2026-01-01");
    await user.type(screen.getByLabelText("Amtszeit-Ende"), "2027-01-01");
    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: "Vorstand" }),
    );

    expect(assignMeepleRoleMock).toHaveBeenCalledWith(
      "meeple-1",
      "role-vorstand",
      { startsAt: new Date("2026-01-01"), endsAt: new Date("2027-01-01") },
    );
  });

  it("removes the '×' from an active Systemrolle badge without admin:access", () => {
    render(
      <MeepleRoleSelect
        meepleId="meeple-1"
        assignments={[
          {
            id: "ur-1",
            roleId: "role-ausgetreten",
            roleName: "Ausgetreten",
            startsAt: new Date("2026-01-01").toISOString(),
            endsAt: null,
          },
        ]}
        roles={ROLES}
        canManageAdminAccess={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Rolle Ausgetreten entfernen/ }),
    ).not.toBeInTheDocument();
  });
});
