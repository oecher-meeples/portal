"use client";

import { useState } from "react";
import { GripVertical, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TextField, TextAreaField } from "@/components/ui/field";
import { ActionDialog } from "@/components/ui/action-dialog";
import { useAction } from "@/components/ui/use-action";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  RolePermissionsEditor,
  type PermissionOption,
} from "@/components/feature/admin-mitglieder/role-permissions-editor";
import {
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  reorderRoles,
} from "@/components/feature/admin-mitglieder/actions";

export type RoleManagementRow = {
  id: string;
  name: string;
  description: string | null;
  permissionIds: string[];
  /** Systemrolle (#353) — Zuweisen/Entfernen erfordert admin:access statt
   * nur members:manage, s. `MeepleRoleSelect`. */
  isSystemRole: boolean;
  /** Kanonische Anzeigereihenfolge (#391), per Drag-and-Drop änderbar. */
  sortOrder: number;
};

/** Eigener MIME-Typ für den Drag-Payload — analog role-permissions-editor.tsx. */
const REORDER_DRAG_MIME = "application/x-role-id";

/** Muss zum in prisma/seed-roles.ts gepflegten Permission-Key passen. */
const ADMIN_ACCESS_PERMISSION_KEY = "admin:access";

/**
 * Rollenverwaltung — nur sichtbar mit `members:manage` (Gate liegt beim
 * Aufrufer, siehe AdminMitgliederView). Server Actions kommen aus #216,
 * die Dual-Listbox aus #217/#218, die Drag-and-Drop-Reihenfolge aus #391.
 */
export function RoleManagementSection({
  roles,
  permissions,
}: {
  roles: RoleManagementRow[];
  permissions: PermissionOption[];
}) {
  // Während eines laufenden Drags/Speicherns überschreibt eine lokale
  // Reihenfolge (nur die IDs) die Serverdaten; danach (Erfolg oder Fehler)
  // übernimmt wieder `roles` — nach Erfolg per router.refresh() (useAction)
  // bereits in der neuen Reihenfolge, nach Fehler unverändert in der alten.
  const [pendingOrderIds, setPendingOrderIds] = useState<string[] | null>(null);
  const [draggedRoleId, setDraggedRoleId] = useState<string | null>(null);
  const { run: runReorder, error: reorderError } = useAction();

  const serverOrderedRoles = [...roles].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const rolesById = new Map(serverOrderedRoles.map((role) => [role.id, role]));
  const orderedRoles = pendingOrderIds
    ? pendingOrderIds
        .map((id) => rolesById.get(id))
        .filter((role) => role !== undefined)
    : serverOrderedRoles;

  const adminAccessPermissionId = permissions.find(
    (permission) => permission.key === ADMIN_ACCESS_PERMISSION_KEY,
  )?.id;

  function moveDraggedRoleBefore(targetRoleId: string) {
    if (!draggedRoleId || draggedRoleId === targetRoleId) return;
    const dragged = orderedRoles.find((role) => role.id === draggedRoleId);
    if (!dragged) return;

    const withoutDragged = orderedRoles.filter(
      (role) => role.id !== draggedRoleId,
    );
    const targetIndex = withoutDragged.findIndex(
      (role) => role.id === targetRoleId,
    );
    const next = [...withoutDragged];
    next.splice(targetIndex, 0, dragged);
    const nextIds = next.map((role) => role.id);

    setPendingOrderIds(nextIds);
    runReorder(() => reorderRoles(nextIds)).then(() => {
      setPendingOrderIds(null);
    });
  }

  return (
    <Accordion className="bg-card rounded-lg border">
      <AccordionItem value="roles" className="border-b-0">
        <AccordionTrigger className="px-5">
          <span className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold">Rollen</span>
            <Badge>{roles.length}</Badge>
          </span>
        </AccordionTrigger>
        <AccordionPanel className="px-5">
          <div className="flex justify-end">
            <CreateRoleDialog />
          </div>
          {reorderError && (
            <p className="text-destructive mt-2 text-xs">{reorderError}</p>
          )}
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {orderedRoles.map((role) => {
              const isSystemAdminRole = Boolean(
                adminAccessPermissionId &&
                role.permissionIds.includes(adminAccessPermissionId),
              );
              return (
                <li
                  key={role.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (event.dataTransfer.getData(REORDER_DRAG_MIME)) {
                      moveDraggedRoleBefore(role.id);
                    }
                  }}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      draggable
                      onDragStart={(event) => {
                        setDraggedRoleId(role.id);
                        event.dataTransfer.setData(REORDER_DRAG_MIME, role.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDraggedRoleId(null)}
                      className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
                      aria-label={`Rolle „${role.name}“ per Drag-and-Drop verschieben`}
                      role="button"
                      tabIndex={0}
                    >
                      <GripVertical className="size-4" />
                    </span>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        <Badge variant="secondary">
                          {role.permissionIds.length}
                        </Badge>
                        {isSystemAdminRole && (
                          <Lock
                            className="text-muted-foreground size-3.5"
                            aria-label="Systemzugriff — Rechte fest verdrahtet"
                          />
                        )}
                      </span>
                      {role.description && (
                        <span className="text-muted-foreground text-xs">
                          {role.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <EditRoleDialog
                      role={role}
                      permissions={permissions}
                      isSystemAdminRole={isSystemAdminRole}
                    />
                    <DeleteRoleDialog role={role} />
                  </div>
                </li>
              );
            })}
          </ul>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}

function CreateRoleDialog() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function reset() {
    setName("");
    setDescription("");
  }

  return (
    <ActionDialog
      trigger={
        <Button size="sm">
          <Plus />
          Neue Rolle
        </Button>
      }
      title="Neue Rolle anlegen"
      description="Die Rolle startet ohne zugewiesene Rechte — die vergibst du danach über „Bearbeiten“."
      submitLabel="Anlegen"
      pendingLabel="Lege an…"
      canSubmit={name.trim().length > 0}
      onReset={reset}
      action={() => createRole(name, description || null)}
    >
      <TextField
        id="new-role-name"
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="off"
      />
      <TextAreaField
        id="new-role-description"
        label="Beschreibung"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
    </ActionDialog>
  );
}

function EditRoleDialog({
  role,
  permissions,
  isSystemAdminRole,
}: {
  role: RoleManagementRow;
  permissions: PermissionOption[];
  /** Diese Rolle gewährt "admin:access" — Name bleibt änderbar, Rechte nicht (siehe setRolePermissions). */
  isSystemAdminRole: boolean;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [permissionIds, setPermissionIds] = useState(role.permissionIds);

  function reset() {
    setName(role.name);
    setDescription(role.description ?? "");
    setPermissionIds(role.permissionIds);
  }

  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          <Pencil />
          Bearbeiten
        </Button>
      }
      title={`Rolle „${role.name}“ bearbeiten`}
      submitLabel="Speichern"
      pendingLabel="Speichere…"
      canSubmit={name.trim().length > 0}
      contentClassName="sm:max-w-2xl"
      onOpen={reset}
      onReset={reset}
      action={async () => {
        const renamed = await updateRole(role.id, name, description || null);
        if ("error" in renamed) return renamed;
        if (isSystemAdminRole) return renamed;
        return setRolePermissions(role.id, permissionIds);
      }}
    >
      <TextField
        id={`role-name-${role.id}`}
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="off"
      />
      <TextAreaField
        id={`role-description-${role.id}`}
        label="Beschreibung"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      {isSystemAdminRole ? (
        <p className="text-muted-foreground bg-muted rounded-md p-3 text-sm">
          Diese Rolle gewährt Systemzugriff und behält deshalb immer alle Rechte
          — sie können hier nicht bearbeitet werden.
        </p>
      ) : (
        <RolePermissionsEditor
          options={permissions}
          value={permissionIds}
          onValueChange={setPermissionIds}
        />
      )}
    </ActionDialog>
  );
}

function DeleteRoleDialog({ role }: { role: RoleManagementRow }) {
  return (
    <ActionDialog
      trigger={
        <Button variant="destructive" size="sm">
          <Trash2 />
          Löschen
        </Button>
      }
      title={`Rolle „${role.name}“ löschen`}
      description={`Mitglieder mit dieser Rolle werden dabei rollenlos, nicht auf eine andere Rolle umgestellt — sie behalten ihr Login-Konto, aber keine Rechte mehr, bis eine Admin-Person ihnen manuell eine neue Rolle zuweist.`}
      submitLabel="Endgültig löschen"
      pendingLabel="Lösche…"
      submitVariant="destructive"
      action={() => deleteRole(role.id)}
    />
  );
}
