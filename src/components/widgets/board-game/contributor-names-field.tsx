"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCommaSeparatedList } from "@/lib/ludothek/bgg-id";
import type { ContributorRole } from "@prisma/client";
import { listContributorNames } from "@/lib/ludothek/taxonomy/contributor-actions";

/**
 * Mitwirkende als Chips. Vorschläge kommen aus dem Bestand dieser Rolle, neue
 * Namen legt Enter an. Der Wert bleibt ein kommagetrennter String, damit das
 * Formular unverändert bleibt.
 */
export function ContributorNamesField({
  label,
  role,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  role: ContributorRole;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const names = parseCommaSeparatedList(value);

  useEffect(() => {
    listContributorNames(role)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [role]);

  function setNames(next: string[]) {
    onChange(next.join(", "));
  }

  function commitDraft() {
    const name = draft.trim();
    setDraft("");
    if (!name || names.includes(name)) return;
    setNames([...names, name]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {names.map((name) => (
            <span
              key={name}
              className="bg-muted inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
            >
              {name}
              <button
                type="button"
                aria-label={`${name} entfernen`}
                onClick={() => setNames(names.filter((n) => n !== name))}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        id={id}
        list={`${id}-options`}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
      />
      <datalist id={`${id}-options`}>
        {suggestions
          .filter((name) => !names.includes(name))
          .map((name) => (
            <option key={name} value={name} />
          ))}
      </datalist>
    </div>
  );
}
