"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action";
import type { AdminTagRow } from "@/lib/ludothek/taxonomy/tag-admin-queries";
import { updateTagDisplayName } from "@/lib/ludothek/taxonomy/tag-admin-actions";

export function TagAdminRow({
  row,
  typeLabel,
}: {
  row: AdminTagRow;
  typeLabel: string;
}) {
  const [draft, setDraft] = useState(row.displayName ?? "");
  const { run, pending, error } = useAction();
  const dirty = draft.trim() !== (row.displayName ?? "");

  return (
    <li>
      <Card size="sm">
        <CardContent className="grid items-center gap-x-4 gap-y-3 sm:grid-cols-[1fr_minmax(200px,320px)_auto]">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{row.name}</span>
              <Badge variant="outline">{typeLabel}</Badge>
              {row.bggId === null && (
                <Badge variant="warning">ohne BGG-ID</Badge>
              )}
            </div>
            <span className="text-muted-foreground text-xs">
              {row.titleCount} Titel
              {row.bggId !== null && ` · BGG-ID ${row.bggId}`}
            </span>
          </div>

          <Input
            aria-label={`Deutscher Name für ${row.name}`}
            value={draft}
            placeholder={row.name}
            onChange={(event) => setDraft(event.target.value)}
          />

          <Button
            size="sm"
            variant="outline"
            disabled={pending || !dirty}
            onClick={() => run(() => updateTagDisplayName(row.id, draft))}
          >
            Speichern
          </Button>

          {error && (
            <p className="text-destructive text-sm sm:col-span-3">{error}</p>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
