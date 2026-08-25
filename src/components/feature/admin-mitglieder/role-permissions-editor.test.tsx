import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RolePermissionsEditor } from "@/components/feature/admin-mitglieder/role-permissions-editor";

afterEach(() => {
  cleanup();
});

const OPTIONS = [
  { id: "perm-a", key: "members:manage", description: "Mitglieder verwalten" },
  { id: "perm-b", key: "bank:read", description: "IBANs einsehen" },
  { id: "perm-c", key: "admin:access", description: "Systemzugriff" },
];

function Assign() {
  return screen.getByRole("button", { name: "Ausgewählte Rechte zuweisen" });
}
function Remove() {
  return screen.getByRole("button", { name: "Ausgewählte Rechte entfernen" });
}

describe("RolePermissionsEditor (#217/#218)", () => {
  it("both move buttons start disabled with no selection", () => {
    render(
      <RolePermissionsEditor
        options={OPTIONS}
        value={[]}
        onValueChange={vi.fn()}
      />,
    );

    expect(Assign()).toBeDisabled();
    expect(Remove()).toBeDisabled();
  });

  it("moves a selected entry from available to assigned via the → button", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RolePermissionsEditor
        options={OPTIONS}
        value={[]}
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByText("bank:read"));
    expect(Assign()).toBeEnabled();
    expect(Remove()).toBeDisabled();

    await user.click(Assign());

    expect(onValueChange).toHaveBeenCalledWith(["perm-b"]);
  });

  it("moves a selected entry from assigned back to available via the ← button", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RolePermissionsEditor
        options={OPTIONS}
        value={["perm-a", "perm-b"]}
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByText("members:manage"));
    expect(Remove()).toBeEnabled();
    expect(Assign()).toBeDisabled();

    await user.click(Remove());

    expect(onValueChange).toHaveBeenCalledWith(["perm-b"]);
  });

  it("re-disables the assign button once the moved item leaves the selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <RolePermissionsEditor
        options={OPTIONS}
        value={[]}
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByText("bank:read"));
    await user.click(Assign());

    // Simulate the caller applying the reported value — the moved id is now
    // in "Zugewiesen" and no longer part of the available selection.
    rerender(
      <RolePermissionsEditor
        options={OPTIONS}
        value={["perm-b"]}
        onValueChange={onValueChange}
      />,
    );

    expect(Assign()).toBeDisabled();
  });
});
