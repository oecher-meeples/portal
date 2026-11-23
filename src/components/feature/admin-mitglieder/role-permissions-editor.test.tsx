import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RolePermissionsEditor } from "@/components/feature/admin-mitglieder/role-permissions-editor";

/** jsdom has no working native DataTransfer — a minimal stand-in that
 * supports exactly what the component uses (#359). */
function fakeDataTransfer() {
  const store = new Map<string, string>();
  return {
    effectAllowed: "none",
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
  };
}

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

  describe("drag and drop (#359)", () => {
    it("moves a dragged entry from available to assigned via drop", () => {
      const onValueChange = vi.fn();
      render(
        <RolePermissionsEditor
          options={OPTIONS}
          value={[]}
          onValueChange={onValueChange}
        />,
      );

      const dataTransfer = fakeDataTransfer();
      const source = screen.getByText("bank:read").closest("li")!;
      const target = screen.getByRole("listbox", { name: "Zugewiesen" });

      fireEvent.dragStart(source, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });

      expect(onValueChange).toHaveBeenCalledWith(["perm-b"]);
    });

    it("carries the whole selection as the drag payload, not just the dragged row", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <RolePermissionsEditor
          options={OPTIONS}
          value={[]}
          onValueChange={onValueChange}
        />,
      );

      // Select two entries first, then drag one of them — both should move.
      await user.click(screen.getByText("bank:read"));
      await user.click(screen.getByText("admin:access"));

      const dataTransfer = fakeDataTransfer();
      const source = screen.getByText("bank:read").closest("li")!;
      const target = screen.getByRole("listbox", { name: "Zugewiesen" });

      fireEvent.dragStart(source, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });

      expect(onValueChange).toHaveBeenCalledWith(
        expect.arrayContaining(["perm-b", "perm-c"]),
      );
    });

    it("moves a dragged entry from assigned back to available via drop", () => {
      const onValueChange = vi.fn();
      render(
        <RolePermissionsEditor
          options={OPTIONS}
          value={["perm-a", "perm-b"]}
          onValueChange={onValueChange}
        />,
      );

      const dataTransfer = fakeDataTransfer();
      const source = screen.getByText("members:manage").closest("li")!;
      const target = screen.getByRole("listbox", { name: "Verfügbar" });

      fireEvent.dragStart(source, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });

      expect(onValueChange).toHaveBeenCalledWith(["perm-b"]);
    });

    it("ignores a drop with no payload instead of crashing", () => {
      const onValueChange = vi.fn();
      render(
        <RolePermissionsEditor
          options={OPTIONS}
          value={[]}
          onValueChange={onValueChange}
        />,
      );

      const target = screen.getByRole("listbox", { name: "Zugewiesen" });
      fireEvent.drop(target, { dataTransfer: fakeDataTransfer() });

      expect(onValueChange).not.toHaveBeenCalled();
    });
  });
});
