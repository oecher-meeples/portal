"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ContributorRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminContributorRow } from "@/lib/ludothek/taxonomy/contributor-admin-queries";
import {
  deleteContributor,
  mergeContributors,
  renameContributor,
} from "@/lib/ludothek/taxonomy/contributor-admin-actions";

const ROLE_BADGE_LABELS: Record<ContributorRole, string> = {
  PUBLISHER: "Verlag",
  AUTHOR: "Autor",
  ILLUSTRATOR: "Illustrator",
};

type ActionResult = { success?: true; error?: string };

export function ContributorAdminRow({
  row,
  allRows,
}: {
  row: AdminContributorRow;
  allRows: AdminContributorRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(row.name);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mergeCandidates = allRows.filter((other) => other.id !== row.id);

  async function run(action: () => Promise<ActionResult>) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <Card size="sm">
        <CardContent className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-3">
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
              <Badge key={role} variant="secondary">
                {ROLE_BADGE_LABELS[role]}
              </Badge>
            ))}
          </div>

          <span className="text-muted-foreground text-right text-xs text-nowrap">
            {row.titleCount} Titel
            {row.bggId !== null && ` · BGG-ID ${row.bggId}`}
          </span>

          <div className="col-span-2 flex flex-wrap items-center justify-end gap-2">
            {editing ? (
              <>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const result = await renameContributor(row.id, nameDraft);
                      if (result.success) setEditing(false);
                      return result;
                    })
                  }
                >
                  Speichern
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
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

            <select
              aria-label="Zusammenführen mit"
              value={mergeTargetId}
              onChange={(event) => setMergeTargetId(event.target.value)}
              className="border-input bg-background h-7 max-w-[220px] rounded-lg border px-2 text-xs"
            >
              <option value="">Zusammenführen mit …</option>
              {mergeCandidates.map((other) => (
                <option key={other.id} value={other.id}>
                  {other.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !mergeTargetId}
              onClick={() =>
                run(() => mergeContributors(row.id, mergeTargetId))
              }
            >
              Zusammenführen
            </Button>

            <Button
              size="sm"
              variant="destructive"
              disabled={busy || row.titleCount > 0}
              title={
                row.titleCount > 0 ? "Noch mit Titeln verknüpft" : undefined
              }
              onClick={() => run(() => deleteContributor(row.id))}
            >
              Löschen
            </Button>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>
    </li>
  );
}
