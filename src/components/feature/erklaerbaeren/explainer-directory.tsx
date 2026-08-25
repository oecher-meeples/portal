"use client";

import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { TextField } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ExplainerListDialogTrigger } from "@/components/entities/explainer-list-dialog-trigger";
import type { ExplainerEntry } from "@/lib/explainer/queries";

export type ExplainerDirectoryEntry = {
  boardGameId: string;
  boardGameTitle: string;
  explainers: ExplainerEntry[];
};

export function ExplainerDirectory({
  entries,
}: {
  entries: ExplainerDirectoryEntry[];
}) {
  const [filter, setFilter] = useState("");
  const [showWithoutExplainer, setShowWithoutExplainer] = useState(false);

  const filteredEntries = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return entries
      .filter((entry) => showWithoutExplainer || entry.explainers.length > 0)
      .filter((entry) => entry.boardGameTitle.toLowerCase().includes(term))
      .sort((a, b) => a.boardGameTitle.localeCompare(b.boardGameTitle, "de"));
  }, [entries, filter, showWithoutExplainer]);

  return (
    <Accordion defaultValue={[]}>
      <AccordionItem value="directory" className="border-b-0">
        <AccordionTrigger className="font-serif text-xl font-semibold hover:no-underline">
          Erklärbären-Verzeichnis
        </AccordionTrigger>
        <AccordionPanel>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TextField
                id="explainer-directory-filter"
                label="Spieltitel filtern"
                fieldClassName="flex-1"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                onClear={() => setFilter("")}
                placeholder="Spielname …"
              />
              <Label
                htmlFor="explainer-directory-show-all"
                className="font-normal"
              >
                Spiele ohne Erklärer anzeigen?
                <Switch
                  id="explainer-directory-show-all"
                  checked={showWithoutExplainer}
                  onCheckedChange={setShowWithoutExplainer}
                />
              </Label>
            </div>

            {filteredEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Kein Spiel passt zu den aktuellen Filtern.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.boardGameId}
                    className="bg-card flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {entry.boardGameTitle}
                    </span>
                    <Badge>{entry.explainers.length}</Badge>
                    <ExplainerListDialogTrigger
                      boardGameTitle={entry.boardGameTitle}
                      explainers={entry.explainers}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
