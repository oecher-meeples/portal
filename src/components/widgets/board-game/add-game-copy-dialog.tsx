"use client";

import { useState } from "react";
import { CopyPlus } from "lucide-react";
import type { RuleBookLanguage } from "@prisma/client";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { RuleBookLanguagesField } from "@/components/widgets/board-game/rule-book-languages-field";
import { createGameCopy } from "@/lib/ludothek/game-copies";

/**
 * Adds another physical copy to an existing title — the "weiteres Exemplar"
 * flow (see ADR 0008). No BGG/title fields here, those already exist on the
 * title; only the new copy's own condition and Regelheft-Sprache(n) are
 * asked for (#188, #203-Folge — vorher nur nachträglich im Exemplar-Editor
 * erfassbar, obwohl eine Schachtel oft schon beim Einräumen bekannt ist).
 */
export function AddGameCopyDialog({
  boardGameId,
  boardGameTitle,
}: {
  boardGameId: string;
  boardGameTitle: string;
}) {
  const [condition, setCondition] = useState("");
  const [ruleBookLanguages, setRuleBookLanguages] = useState<
    RuleBookLanguage[]
  >([]);

  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          <CopyPlus className="size-4" />
          Weiteres Exemplar
        </Button>
      }
      title={`Weiteres Exemplar von „${boardGameTitle}“ anlegen`}
      description="Das neue Exemplar liegt zunächst in „Unsortiert“ — Standort per Scan einlagern."
      submitLabel="Anlegen"
      action={() =>
        createGameCopy(boardGameId, {
          condition: condition || undefined,
          ruleBookLanguages,
        })
      }
      onReset={() => {
        setCondition("");
        setRuleBookLanguages([]);
      }}
    >
      <TextField
        id={`add-copy-${boardGameId}-condition`}
        label="Mängelvermerk"
        value={condition}
        onChange={(event) => setCondition(event.target.value)}
      />
      <RuleBookLanguagesField
        idPrefix={`add-copy-${boardGameId}`}
        value={ruleBookLanguages}
        onChange={setRuleBookLanguages}
      />
    </ActionDialog>
  );
}
