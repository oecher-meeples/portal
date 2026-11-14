"use client";

import { useEffect, useState } from "react";
import { Field, TextField } from "@/components/ui/field";
import { ContributorNamesField } from "@/components/widgets/board-game/contributor-names-field";
import {
  getBoardGameEditions,
  getUnsavedBggVersions,
} from "@/lib/ludothek/taxonomy/version-actions";
import type { EditionOption } from "@/lib/ludothek/taxonomy/version-actions";
import {
  selectRelevantVersions,
  versionInputFromBgg,
} from "@/lib/ludothek/board-game-versions";
import { describeVersion } from "@/lib/ludothek/taxonomy/version-label";
import type { BggVersion } from "@/lib/bgg/client";
import {
  versionInputToFormPatch,
  type BoardGameFormValues,
} from "@/components/widgets/board-game/board-game-form-values";

const NEW_EDITION = "__new__";
const BGG_PREFIX = "bgg:";

/** Lädt per Server Action die Daten zu `key`, solange `key` gesetzt ist.
 * `loadedFor` ist der Schlüssel der zuletzt abgeschlossenen Abfrage — daraus
 * leitet der Aufrufer „lädt noch" ab, statt im Effect einen Lade-State zu
 * setzen. Fehler lassen den bisherigen Wert stehen: beide Listen sind
 * optional, der Dialog bleibt bedienbar. */
function useLoadedFor<T>(
  key: string | null,
  load: (key: string) => Promise<T>,
  initial: T,
) {
  const [value, setValue] = useState<T>(initial);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    load(key)
      .then((loaded) => {
        if (!cancelled) setValue(loaded);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadedFor(key);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` ist eine stabile Server Action, neu geladen wird nur bei neuem Schlüssel
  }, [key]);

  return { value, loadedFor };
}

const NO_EDITIONS: EditionOption[] = [];
const NO_BGG_VERSIONS: BggVersion[] = [];

/** Deutsche Versionen zuerst (meist die relevanten), dann der Rest. */
function germanFirst(versions: BggVersion[]): BggVersion[] {
  const relevant = selectRelevantVersions(versions);
  return [...relevant, ...versions.filter((v) => !relevant.includes(v))];
}

/**
 * Version (Edition) eines Exemplars — Verlag(e) und Sprache(n). Gehört zum
 * Exemplar, nicht zum Titel: zwei Exemplare desselben Spiels können
 * verschiedene Versionen sein. Ein Dropdown für alles: ohne Version, eine
 * bereits gespeicherte Version des Titels (`boardGameId`), eine Version von
 * BGG oder eine manuell eingegebene. Die BGG-Versionen kommen im
 * Anlegen-Wizard aus der Vorschau (`bggVersions`), sonst lädt das Feld die
 * noch nicht gespeicherten Versionen des Titels selbst von BGG. BGG- und
 * manuelle Versionen bleiben in den Feldern darunter editierbar.
 */
export function EditionFields({
  idPrefix,
  values,
  onChange,
  boardGameId,
  bggVersions,
  onSelectBggVersion,
}: {
  idPrefix: string;
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
  boardGameId?: string;
  bggVersions?: BggVersion[];
  /** Übernimmt eine BGG-Version ins Formular — ohne Angabe nur Verlag,
   * Sprache und Product Code der Version. */
  onSelectBggVersion?: (version: BggVersion) => void;
}) {
  const { value: options } = useLoadedFor(
    boardGameId ?? null,
    getBoardGameEditions,
    NO_EDITIONS,
  );
  // Im Wizard liefert die Vorschau die BGG-Versionen, sonst fragt das Feld
  // BGG selbst nach den noch nicht gespeicherten Versionen des Titels.
  const bggKey = boardGameId && bggVersions === undefined ? boardGameId : null;
  const { value: loadedBggVersions, loadedFor: bggLoadedFor } = useLoadedFor(
    bggKey,
    getUnsavedBggVersions,
    NO_BGG_VERSIONS,
  );
  const sortedBggVersions = germanFirst(bggVersions ?? loadedBggVersions);
  const loadingBgg = bggKey !== null && bggLoadedFor !== bggKey;

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
      if (!version) return;
      if (onSelectBggVersion) onSelectBggVersion(version);
      else onChange(versionInputToFormPatch(versionInputFromBgg(version)));
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
      <Field
        label="Version"
        htmlFor={`${idPrefix}-edition`}
        hint={loadingBgg && "Versionen von BGG werden geladen …"}
      >
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
      </Field>
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
