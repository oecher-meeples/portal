import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleManagementSection } from "@/components/feature/admin-mitglieder/role-management-section";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const createRoleMock = vi.fn();
const updateRoleMock = vi.fn();
const deleteRoleMock = vi.fn();
const setRolePermissionsMock = vi.fn();
vi.mock("@/components/feature/admin-mitglieder/actions", () => ({
  createRole: (...args: unknown[]) => createRoleMock(...args),
  updateRole: (...args: unknown[]) => updateRoleMock(...args),
  deleteRole: (...args: unknown[]) => deleteRoleMock(...args),
  setRolePermissions: (...args: unknown[]) => setRolePermissionsMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const PERMISSIONS = [
  {
    id: "perm-manage",
    key: "members:manage",
    description: "Mitglieder verwalten",
  },
  { id: "perm-admin", key: "admin:access", description: "Systemzugriff" },
];

const ROLES = [
  {
    id: "role-vorstand",
    name: "Vorstand",
    description: "Leitung des Vereins",
    permissionIds: ["perm-manage"],
  },
  {
    id: "role-admin",
    name: "Admin",
    description: null,
    permissionIds: ["perm-manage", "perm-admin"],
  },
];

async function openAccordion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Rollen/ }));
}

describe("RoleManagementSection — Anlegen (#219)", () => {
  it("creates a role with name and description, then closes the dialog", async () => {
    const user = userEvent.setup();
    createRoleMock.mockResolvedValue({ success: true });
    render(<RoleManagementSection roles={ROLES} permissions={PERMISSIONS} />);
    await openAccordion(user);

    await user.click(screen.getByRole("button", { name: "Neue Rolle" }));
    await user.type(screen.getByLabelText("Name"), "Kassenwart");
    await user.type(screen.getByLabelText("Beschreibung"), "Finanzen");
    await user.click(screen.getByRole("button", { name: "Anlegen" }));

    expect(createRoleMock).toHaveBeenCalledWith("Kassenwart", "Finanzen");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Neue Rolle anlegen" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("disables the submit button while the name is blank", async () => {
    const user = userEvent.setup();
    render(<RoleManagementSection roles={ROLES} permissions={PERMISSIONS} />);
    await openAccordion(user);

    await user.click(screen.getByRole("button", { name: "Neue Rolle" }));

    expect(screen.getByRole("button", { name: "Anlegen" })).toBeDisabled();
  });

  it("shows a duplicate-name error instead of closing the dialog", async () => {
    const user = userEvent.setup();
    createRoleMock.mockResolvedValue({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });
    render(<RoleManagementSection roles={ROLES} permissions={PERMISSIONS} />);
    await openAccordion(user);

    await user.click(screen.getByRole("button", { name: "Neue Rolle" }));
    await user.type(screen.getByLabelText("Name"), "Vorstand");
    await user.click(screen.getByRole("button", { name: "Anlegen" }));

    expect(
      await screen.findByText(
        "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
      ),
    ).toBeInTheDocument();
    // Dialog stays open on error — the field is still visible.
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});

describe("RoleManagementSection — Bearbeiten (#219)", () => {
  it("prefills name, description and assigned permissions, then saves both", async () => {
    const user = userEvent.setup();
    updateRoleMock.mockResolvedValue({ success: true });
    setRolePermissionsMock.mockResolvedValue({ success: true });
    render(<RoleManagementSection roles={ROLES} permissions={PERMISSIONS} />);
    await openAccordion(user);

    const vorstandRow = screen.getByText("Vorstand").closest("li")!;
    await user.click(
      within(vorstandRow).getByRole("button", { name: "Bearbeiten" }),
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Vorstand");
    expect(screen.getByLabelText("Beschreibung")).toHaveValue(
      "Leitung des Vereins",
    );

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Vorstand e.V.");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(updateRoleMock).toHaveBeenCalledWith(
      "role-vorstand",
      "Vorstand e.V.",
      "Leitung des Vereins",
    );
    expect(setRolePermissionsMock).toHaveBeenCalledWith("role-vorstand", [
      "perm-manage",
    ]);
  });

  it("shows a rule-violation error and keeps editing open", async () => {
    const user = userEvent.setup();
    updateRoleMock.mockResolvedValue({
      error: "Eine Rolle mit dem Namen „Admin“ existiert bereits.",
    });
    render(<RoleManagementSection roles={ROLES} permissions={PERMISSIONS} />);
    await openAccordion(user);

    const vorstandRow = screen.getByText("Vorstand").closest("li")!;
    await user.click(
      within(vorstandRow).getByRole("button", { name: "Bearbeiten" }),
    );
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(
      await screen.findByText(
        "Eine Rolle mit dem Namen „Admin“ existiert bereits.",
      ),
    ).toBeInTheDocument();
    expect(setRolePermissionsMock).not.toHaveBeenCalled();
  });

  it("locks out the permissions editor for the role granting admin:access", async () => {
    const user = userEvent.setup();
    render(<RoleManagementSection roles={ROLES} permissions={PERMISSIONS} />);
    await openAccordion(user);

    const adminRow = screen.getByText("Admin").closest("li")!;
    await user.click(
      within(adminRow).getByRole("button", { name: "Bearbeiten" }),
    );

    expect(
      screen.getByText(/behält deshalb immer alle Rechte/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Verfügbar")).not.toBeInTheDocument();
  });
});

describe("RoleManagementSection — Löschen (#219)", () => {
  it("deletes the role after confirmation", async () => {
    const user = userEvent.setup();
    deleteRoleMock.mockResolvedValue({ success: true });
    render(<RoleManagementSection roles={ROLES} permissions={PERMISSIONS} />);
    await openAccordion(user);

    const vorstandRow = screen.getByText("Vorstand").closest("li")!;
    await user.click(
      within(vorstandRow).getByRole("button", { name: "Löschen" }),
    );
    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));

    expect(deleteRoleMock).toHaveBeenCalledWith("role-vorstand");
  });
});
