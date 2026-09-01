"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import type { ActionResult } from "@/components/ui/use-action";
import {
  MemberCombobox,
  type MemberOption,
} from "@/components/entities/member-combobox";
import {
  addGuardian,
  addWard,
  listGuardianManagement,
  listWardManagement,
  removeGuardian,
  removeWard,
} from "@/components/feature/admin-mitglieder/member-actions";

type LinkDirectionConfig = {
  title: string;
  emptyLabel: string;
  placeholder: string;
  removeAriaLabel: (name: string) => string;
  list: (memberId: string) => Promise<{
    items: MemberOption[];
    candidates: MemberOption[];
  }>;
  add: (memberId: string, otherId: string) => Promise<ActionResult>;
  remove: (memberId: string, otherId: string) => Promise<ActionResult>;
};

/** Ein Verwaltungs-Widget für beide Richtungen derselben `MemberGuardian`-
 * Verknüpfung (#372) — Erziehungsberechtigte eines Kindes und, vice versa,
 * Schutzbefohlene eines Erziehungsberechtigten. Lädt lazy erst bei
 * geöffnetem Dialog, kein Prop-Drilling der gesamten Mitgliederliste in
 * jede Tabellenzeile. */
function LinkManagementSection({
  memberId,
  config,
}: {
  memberId: string;
  config: LinkDirectionConfig;
}) {
  const [items, setItems] = useState<MemberOption[] | null>(null);
  const [candidates, setCandidates] = useState<MemberOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    config.list(memberId).then((data) => {
      if (cancelled) return;
      setItems(data.items);
      setCandidates(data.candidates);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `config` ist ein stabiles Modul-Literal je Aufrufer.
  }, [memberId]);

  async function handleAdd() {
    if (!selected) return;
    await config.add(memberId, selected);
    const data = await config.list(memberId);
    setItems(data.items);
    setCandidates(data.candidates);
    setSelected(null);
  }

  async function handleRemoved(otherId: string) {
    setItems((prev) => prev?.filter((item) => item.id !== otherId) ?? null);
    const data = await config.list(memberId);
    setCandidates(data.candidates);
  }

  return (
    <div className="flex flex-col gap-1.5 border-t pt-4">
      <span className="text-sm font-medium">{config.title}</span>

      {items === null ? (
        <p className="text-muted-foreground text-sm">Lade…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{config.emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>{item.displayName}</span>
              <ActionButton
                action={() => config.remove(memberId, item.id)}
                onSuccess={() => handleRemoved(item.id)}
                refresh={false}
                variant="ghost"
                size="icon-sm"
                aria-label={config.removeAriaLabel(item.displayName)}
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
          placeholder={config.placeholder}
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

/** Erziehungsberechtigten-Verwaltung für einen Member als Kind — nur mit
 * `members:manage` sichtbar (gate liegt in den aufgerufenen Server Actions). */
export function GuardianManagementSection({
  childMemberId,
}: {
  childMemberId: string;
}) {
  return (
    <LinkManagementSection
      memberId={childMemberId}
      config={{
        title: "Erziehungsberechtigte",
        emptyLabel: "Keine Erziehungsberechtigten verknüpft.",
        placeholder: "Erziehungsberechtigte:n hinzufügen …",
        removeAriaLabel: (name) =>
          `${name} als Erziehungsberechtigte:n entfernen`,
        list: async (memberId) => {
          const data = await listGuardianManagement(memberId);
          return { items: data.guardians, candidates: data.candidates };
        },
        add: addGuardian,
        remove: removeGuardian,
      }}
    />
  );
}

/** Vice versa (#372-Folgeticket): Schutzbefohlenen-Verwaltung für einen
 * Member als Erziehungsberechtigte:n — dieselbe `MemberGuardian`-Kante, nur
 * von der anderen Seite gepflegt. */
export function WardManagementSection({
  guardianMemberId,
}: {
  guardianMemberId: string;
}) {
  return (
    <LinkManagementSection
      memberId={guardianMemberId}
      config={{
        title: "Schutzbefohlene",
        emptyLabel: "Keine Schutzbefohlenen verknüpft.",
        placeholder: "Schutzbefohlene:n hinzufügen …",
        removeAriaLabel: (name) => `${name} als Schutzbefohlene:n entfernen`,
        list: async (memberId) => {
          const data = await listWardManagement(memberId);
          return { items: data.wards, candidates: data.candidates };
        },
        add: addWard,
        remove: removeWard,
      }}
    />
  );
}
