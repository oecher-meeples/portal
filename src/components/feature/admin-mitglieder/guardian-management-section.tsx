"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import {
  MemberCombobox,
  type MemberOption,
} from "@/components/entities/member-combobox";
import {
  addGuardian,
  listGuardianManagement,
  removeGuardian,
} from "@/components/feature/admin-mitglieder/member-actions";

/** Erziehungsberechtigten-Verwaltung (#372) für einen Member als Kind — nur
 * mit `members:manage` sichtbar (gate liegt in den aufgerufenen Server
 * Actions). Lädt lazy erst bei geöffnetem Dialog, kein Prop-Drilling der
 * gesamten Mitgliederliste in jede Tabellenzeile. */
export function GuardianManagementSection({
  childMemberId,
}: {
  childMemberId: string;
}) {
  const [guardians, setGuardians] = useState<MemberOption[] | null>(null);
  const [candidates, setCandidates] = useState<MemberOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listGuardianManagement(childMemberId).then((data) => {
      if (cancelled) return;
      setGuardians(data.guardians);
      setCandidates(data.candidates);
    });
    return () => {
      cancelled = true;
    };
  }, [childMemberId]);

  async function handleAdd() {
    if (!selected) return;
    await addGuardian(childMemberId, selected);
    const data = await listGuardianManagement(childMemberId);
    setGuardians(data.guardians);
    setCandidates(data.candidates);
    setSelected(null);
  }

  async function handleRemoved(guardianId: string) {
    setGuardians(
      (prev) => prev?.filter((guardian) => guardian.id !== guardianId) ?? null,
    );
    const data = await listGuardianManagement(childMemberId);
    setCandidates(data.candidates);
  }

  return (
    <div className="flex flex-col gap-1.5 border-t pt-4">
      <span className="text-sm font-medium">Erziehungsberechtigte</span>

      {guardians === null ? (
        <p className="text-muted-foreground text-sm">Lade…</p>
      ) : guardians.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Keine Erziehungsberechtigten verknüpft.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {guardians.map((guardian) => (
            <li
              key={guardian.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>{guardian.displayName}</span>
              <ActionButton
                action={() => removeGuardian(childMemberId, guardian.id)}
                onSuccess={() => handleRemoved(guardian.id)}
                refresh={false}
                variant="ghost"
                size="icon-sm"
                aria-label={`${guardian.displayName} als Erziehungsberechtigte:n entfernen`}
              >
                <X />
              </ActionButton>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <MemberCombobox
          options={candidates}
          value={selected}
          onValueChange={setSelected}
          placeholder="Erziehungsberechtigte:n hinzufügen …"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selected}
          onClick={handleAdd}
        >
          Hinzufügen
        </Button>
      </div>
    </div>
  );
}
