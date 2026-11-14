"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { TriangleAlertIcon, PlusIcon, XIcon } from "lucide-react";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopup,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { parseCommaSeparatedList } from "@/lib/ludothek/bgg-id";
import type { ContributorRole } from "@prisma/client";
import {
  createContributor,
  listContributorNames,
} from "@/lib/ludothek/taxonomy/contributor-actions";

/**
 * Mitwirkende als Chips. Vorschläge kommen aus dem Bestand dieser Rolle, neue
 * Namen legt Enter an. Der Wert bleibt ein kommagetrennter String, damit das
 * Formular unverändert bleibt. Ein Name ohne Treffer in den Vorschlägen
 * bekommt ein Warnsymbol und einen "+"-Button, der ihn als Mitwirkenden
 * anlegt — bis dahin meldet `onValidityChange(false)`, damit die aufrufende
 * Seite das Speichern blockieren kann. `knownNames` gelten zusätzlich als
 * bekannt (z. B. Verlage einer BGG-Version, die beim Speichern mit ihrer
 * BGG-ID angelegt werden).
 *
 * Übernommen wird nur per Enter/Komma oder Klick auf einen Vorschlag im
 * Popup, nie beim bloßen Verlassen des Felds (Fokuswechsel) — ein
 * halbfertig eingetippter Name soll nicht ungefragt als Chip landen.
 */
export function ContributorNamesField({
  label,
  role,
  value,
  onChange,
  placeholder,
  onValidityChange,
  knownNames = [],
}: {
  label: string;
  role: ContributorRole;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onValidityChange?: (valid: boolean) => void;
  knownNames?: string[];
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [highlighted, setHighlighted] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [creating, setCreating] = useState<string | null>(null);
  const names = parseCommaSeparatedList(value);
  const unknownNames = names.filter(
    (name) => !suggestions.includes(name) && !knownNames.includes(name),
  );
  const availableSuggestions = suggestions.filter(
    (name) => !names.includes(name),
  );

  useEffect(() => {
    listContributorNames(role)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [role]);

  useEffect(() => {
    onValidityChange?.(unknownNames.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei tatsächlicher Änderung der unbekannten Namen neu melden
  }, [unknownNames.join("\u0000")]);

  async function handleCreate(name: string) {
    setCreating(name);
    try {
      const result = await createContributor(name);
      if (result.success) setSuggestions((prev) => [...prev, name]);
    } finally {
      setCreating(null);
    }
  }

  function setNames(next: string[]) {
    onChange(next.join(", "));
  }

  function commit(name: string) {
    const trimmed = name.trim();
    if (!trimmed || names.includes(trimmed)) return;
    setNames([...names, trimmed]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(highlighted ?? draft);
      setDraft("");
      setHighlighted(undefined);
    }
  }

  return (
    // `contents`: die drei Kinder (Label, Chip-Zone, Eingabefeld) werden zu
    // direkten Grid-Items des Elternrasters (`grid-flow-col grid-rows-3` in
    // `EditBoardGameTitle`) — so bekommt jede Zeile (Chip-Zone, Eingabefeld)
    // über Verlag/Autor/Illustrator hinweg automatisch dieselbe Höhe, ohne
    // JS-Messung (#493-Folge).
    <div className="contents">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex min-h-[1.625rem] flex-wrap items-start gap-1.5">
        {names.map((name) => {
          const isUnknown = unknownNames.includes(name);
          return (
            <span
              key={name}
              className={
                isUnknown
                  ? "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-700 dark:text-amber-400"
                  : "bg-muted inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
              }
            >
              {isUnknown && (
                <TriangleAlertIcon
                  className="size-3"
                  aria-label="Unbekannter Name"
                />
              )}
              {name}
              {isUnknown && (
                <button
                  type="button"
                  aria-label={`${name} als Mitwirkenden anlegen`}
                  disabled={creating === name}
                  onClick={() => handleCreate(name)}
                  className="hover:text-foreground"
                >
                  <PlusIcon className="size-3" />
                </button>
              )}
              <button
                type="button"
                aria-label={`${name} entfernen`}
                onClick={() => setNames(names.filter((n) => n !== name))}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          );
        })}
      </div>
      <Combobox
        items={availableSuggestions}
        inputValue={draft}
        onInputValueChange={(nextValue, eventDetails) => {
          // Nach einem Popup-Klick würde Base UI den Namen ins Feld
          // übernehmen (fillInputOnItemPress) — stattdessen übernimmt
          // onValueChange unten den Namen als Chip, das Feld bleibt leer.
          if (eventDetails.reason === "item-press") {
            setDraft("");
            return;
          }
          setDraft(nextValue);
        }}
        onValueChange={(name) => {
          if (name) commit(name);
        }}
        onItemHighlighted={(itemValue) => setHighlighted(itemValue)}
      >
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
        />
        <ComboboxPopup>
          <ComboboxEmpty>
            Keine Treffer — Enter übernimmt den eingegebenen Namen.
          </ComboboxEmpty>
          <ComboboxList>
            {(name: string) => (
              <ComboboxItem key={name} value={name}>
                {name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </div>
  );
}
