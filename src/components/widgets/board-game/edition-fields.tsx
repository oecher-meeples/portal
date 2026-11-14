"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { TextField } from "@/components/ui/field";
import { ContributorNamesField } from "@/components/widgets/board-game/contributor-names-field";
import { getBoardGameEditions } from "@/lib/ludothek/taxonomy/version-actions";
import type { EditionOption } from "@/lib/ludothek/taxonomy/version-actions";
import { selectRelevantVersions } from "@/lib/ludothek/board-game-versions";
import { describeVersion } from "@/lib/ludothek/taxonomy/version-label";
import type { BggVersion } from "@/lib/bgg/client";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";

const NEW_EDITION = "__new__";
const BGG_PREFIX = "bgg:";

/** Deutsche Versionen zuerst (meist die relevanten), dann der Rest. */
function germanFirst(versions: BggVersion[]): BggVersion[] {
  const relevant = selectRelevantVersions(versions);
  return [...relevant, ...versions.filter((v) => !relevant.includes(v))];
}

/**
 * Version (Edition) eines Exemplars — Verlag(e) und Sprache(n). Gehört zum
 * Exemplar, nicht zum Titel: zwei Exemplare desselben Spiels können
 * verschiedene Versionen sein. Ein Dropdown für alles: ohne Version, eine
 * bereits gespeicherte Version des Titels (`boardGameId`), eine Version aus
 * der BGG-Vorschau (`bggVersions`, nur im Anlegen-Wizard) oder eine manuell
 * eingegebene. BGG- und manuelle Versionen bleiben in den Feldern darunter
 * editierbar.
 */
export function EditionFields({
  idPrefix,
  values,
  onChange,
  boardGameId,
  bggVersions = [],
  onSelectBggVersion,
}: {
  idPrefix: string;
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
  boardGameId?: string;
  bggVersions?: BggVersion[];
  /** Übernimmt eine BGG-Version (Verlag, Sprache, Product Code) ins Formular. */
  onSelectBggVersion?: (version: BggVersion) => void;
}) {
  const [options, setOptions] = useState<EditionOption[]>([]);
  const sortedBggVersions = germanFirst(bggVersions);

  useEffect(() => {
    if (!boardGameId) return;
    let cancelled = false;
    getBoardGameEditions(boardGameId)
      .then((loaded) => {
        if (!cancelled) setOptions(loaded);
      })
      .catch(() => {
        // Ohne Liste bleibt nur „neue Version" — kein Grund, den Dialog zu blockieren.
      });
    return () => {
      cancelled = true;
    };
  }, [boardGameId]);

  const selectedBggIndex =
    values.editionMode === "new" && values.bggVersion?.bggVersionId != null
      ? sortedBggVersions.findIndex(
          (v) => v.bggVersionId === values.bggVersion?.bggVersionId,
        )
      : -1;
  const selectValue =
    values.editionMode === "existing"
      ? values.editionVersionId
      : selectedBggIndex >= 0
        ? `${BGG_PREFIX}${selectedBggIndex}`
        : values.editionMode === "new"
          ? NEW_EDITION
          : "";

  function handleSelect(next: string) {
    if (next.startsWith(BGG_PREFIX)) {
      const version = sortedBggVersions[Number(next.slice(BGG_PREFIX.length))];
      if (version) onSelectBggVersion?.(version);
      return;
    }
    if (next === NEW_EDITION) {
      // Manuell: BGG-Bezug lösen, bereits übernommene Angaben bleiben stehen.
      onChange({ editionMode: "new", editionVersionId: "", bggVersion: null });
      return;
    }
    onChange({
      editionMode: next === "" ? "none" : "existing",
      editionVersionId: next,
      bggVersion: null,
    });
  }

  // Namen aus der BGG-Version tragen eine BGG-ID und werden beim Speichern
  // angelegt — sie sind kein „unbekannter Name".
  const bggPublisherNames =
    values.bggVersion?.publisherLinks.map((link) => link.name) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-edition`}>Version</Label>
        <select
          id={`${idPrefix}-edition`}
          value={selectValue}
          onChange={(event) => handleSelect(event.target.value)}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Ohne Version</option>
          {options.length > 0 && (
            <optgroup label="Vorhandene Versionen">
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          )}
          {sortedBggVersions.length > 0 && (
            <optgroup label="Versionen auf BGG">
              {sortedBggVersions.map((version, index) => (
                <option
                  key={version.bggVersionId ?? index}
                  value={`${BGG_PREFIX}${index}`}
                >
                  {describeVersion({
                    publishers: version.publisher,
                    languages: version.languages,
                    yearPublished: version.yearPublished,
                    name: version.name,
                  })}
                  {version.productCode
                    ? ` — Product Code ${version.productCode}`
                    : ""}
                </option>
              ))}
            </optgroup>
          )}
          <option value={NEW_EDITION}>Neue Version manuell eingeben …</option>
        </select>
      </div>
      {values.editionMode === "new" && (
        <div className="flex flex-col gap-3 border-l-2 pl-3">
          <div className="flex flex-col gap-1.5">
            <ContributorNamesField
              label="Verlag(e) der Version"
              role="PUBLISHER"
              value={values.publisher}
              onChange={(publisher) => onChange({ publisher })}
              placeholder="z. B. Feuerland Spiele"
              knownNames={bggPublisherNames}
            />
          </div>
          <TextField
            id={`${idPrefix}-edition-languages`}
            label="Sprache(n) der Version"
            value={values.editionLanguages}
            onChange={(event) =>
              onChange({ editionLanguages: event.target.value })
            }
            placeholder="BGG-Name, z. B. English — Deutsch leer lassen"
          />
        </div>
      )}
    </div>
  );
}
