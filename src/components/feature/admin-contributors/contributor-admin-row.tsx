"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action";
import { ContributorRolePill } from "@/components/entities/contributor-role-pill";
import type { AdminContributorRow } from "@/lib/ludothek/taxonomy/contributor-admin-queries";
import {
  deleteContributor,
  renameContributor,
} from "@/lib/ludothek/taxonomy/contributor-admin-actions";

/**
 * Eine Mitwirkenden-Zeile. Das Zusammenführen-Ziel wählt die Zeile nicht
 * selbst (#520: sonst N×N `<option>`-Knoten) — `onMerge` öffnet den einen
 * geteilten Dialog der Übersicht.
 */
export function ContributorAdminRow({
  row,
  onMerge,
}: {
  row: AdminContributorRow;
  onMerge: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(row.name);
  const { run, pending, error } = useAction();

  return (
    <li>
      <Card size="sm">
        <CardContent className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {editing ? (
                <Input
                  aria-label="Neuer Name"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  className="max-w-xs"
                />
              ) : (
                <span className="font-medium">{row.name}</span>
              )}
              {row.roles.map((role) => (
                <ContributorRolePill key={role} role={role} />
              ))}
            </div>
            <span className="text-muted-foreground text-xs">
              {row.titleCount} Titel
              {row.bggId !== null && ` · BGG-ID ${row.bggId}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {editing ? (
              <>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={async () => {
                    const saved = await run(() =>
                      renameContributor(row.id, nameDraft),
                    );
                    if (saved) setEditing(false);
                  }}
                >
                  Speichern
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNameDraft(row.name);
                    setEditing(false);
                  }}
                >
                  Abbrechen
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                Umbenennen
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={onMerge}
            >
              Zusammenführen …
            </Button>

            <Button
              size="sm"
              variant="destructive"
              disabled={pending || row.titleCount > 0}
              title={
                row.titleCount > 0 ? "Noch mit Titeln verknüpft" : undefined
              }
              onClick={() => run(() => deleteContributor(row.id))}
            >
              Löschen
            </Button>
          </div>

          {error && (
            <p className="text-destructive col-span-2 text-sm">{error}</p>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
