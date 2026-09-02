"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, TextField } from "@/components/ui/field";
import { ActionDialog } from "@/components/ui/action-dialog";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  createHelperRoleAction,
  updateHelperRoleAction,
  deleteHelperRoleAction,
} from "@/components/feature/admin-events/helper-role-actions";

export type HelperRoleRow = {
  id: string;
  name: string;
  grantsPermissionKey: string | null;
};

export type PermissionOption = { key: string; description: string };

/**
 * Globale Helferrollen-Verwaltung (ADR-0012) — ersetzt das feste ShiftType-
 * Enum. Rollen werden einmal angelegt und stehen danach bei jedem Event zur
 * Auswahl. Struktur folgt RoleManagementSection (admin-mitglieder), aber mit
 * einer einzelnen optionalen Permission statt der Dual-Listbox — eine
 * Helferrolle gewährt höchstens eine Permission (§ hasRoleGrantedPermission).
 */
export function HelperRoleManagementSection({
  roles,
  permissions,
}: {
  roles: HelperRoleRow[];
  permissions: PermissionOption[];
}) {
  const sortedRoles = [...roles].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Accordion className="bg-card rounded-lg border">
      <AccordionItem value="helper-roles" className="border-b-0">
        <AccordionTrigger className="px-5">
          <span className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold">Helferrollen</span>
            <Badge>{roles.length}</Badge>
          </span>
        </AccordionTrigger>
        <AccordionPanel className="px-5">
          <div className="flex justify-end">
            <HelperRoleDialog permissions={permissions} />
          </div>
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {sortedRoles.map((role) => (
              <li
                key={role.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{role.name}</span>
                  {role.grantsPermissionKey && (
                    <span className="text-muted-foreground text-xs">
                      Gewährt „{role.grantsPermissionKey}“ während der
                      zugewiesenen Schicht
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <HelperRoleDialog role={role} permissions={permissions} />
                  <DeleteHelperRoleDialog role={role} />
                </div>
              </li>
            ))}
          </ul>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}

function HelperRoleDialog({
  role,
  permissions,
}: {
  role?: HelperRoleRow;
  permissions: PermissionOption[];
}) {
  const isEdit = Boolean(role);
  const [name, setName] = useState(role?.name ?? "");
  const [grantsPermissionKey, setGrantsPermissionKey] = useState(
    role?.grantsPermissionKey ?? "",
  );

  function reset() {
    setName(role?.name ?? "");
    setGrantsPermissionKey(role?.grantsPermissionKey ?? "");
  }

  return (
    <ActionDialog
      trigger={
        isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil />
            Bearbeiten
          </Button>
        ) : (
          <Button size="sm">
            <Plus />
            Neue Helferrolle
          </Button>
        )
      }
      title={
        isEdit ? `Helferrolle „${role!.name}“ bearbeiten` : "Neue Helferrolle"
      }
      description="Optional gewährt die Rolle eine Permission für die Dauer der zugewiesenen Schicht (z. B. Kasse → Flohmarkt-Kasse bedienen)."
      submitLabel={isEdit ? "Speichern" : "Anlegen"}
      pendingLabel={isEdit ? "Speichere…" : "Lege an…"}
      canSubmit={name.trim().length > 0}
      onOpen={reset}
      onReset={reset}
      action={() =>
        isEdit
          ? updateHelperRoleAction(role!.id, name, grantsPermissionKey || null)
          : createHelperRoleAction(name, grantsPermissionKey || null)
      }
    >
      <TextField
        id={`helper-role-name-${role?.id ?? "new"}`}
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="off"
      />
      <Field
        label="Gewährte Permission"
        htmlFor={`helper-role-permission-${role?.id ?? "new"}`}
        hint={
          permissions.find(
            (permission) => permission.key === grantsPermissionKey,
          )?.description
        }
      >
        <select
          id={`helper-role-permission-${role?.id ?? "new"}`}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={grantsPermissionKey}
          onChange={(event) => setGrantsPermissionKey(event.target.value)}
        >
          <option value="">Keine</option>
          {permissions.map((permission) => (
            <option key={permission.key} value={permission.key}>
              {permission.key}
            </option>
          ))}
        </select>
      </Field>
    </ActionDialog>
  );
}

function DeleteHelperRoleDialog({ role }: { role: HelperRoleRow }) {
  return (
    <ActionDialog
      trigger={
        <Button variant="destructive" size="sm">
          <Trash2 />
          Löschen
        </Button>
      }
      title={`Helferrolle „${role.name}“ löschen`}
      description="Nur möglich, solange keine Schicht mehr diese Rolle nutzt."
      submitLabel="Endgültig löschen"
      pendingLabel="Lösche…"
      submitVariant="destructive"
      action={() => deleteHelperRoleAction(role.id)}
    />
  );
}
