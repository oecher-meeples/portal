"use client";

import { useMemo, useState } from "react";
import type { TagType } from "@prisma/client";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { Field, TextField } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import type { AdminTagRow } from "@/lib/ludothek/taxonomy/tag-admin-queries";
import { TAG_TYPE_LABELS, tagLabel } from "@/lib/ludothek/taxonomy/tags-read";
import { TagAdminRow } from "@/components/feature/admin-tags/tag-admin-row";

type TypeFilter = "ALL" | TagType;

const TYPE_FILTER_LABELS: Record<TypeFilter, string> = {
  ALL: "Alle Typen",
  MECHANIC: "Mechaniken",
  CATEGORY: "Kategorien",
};

type StateFilter = "ALL" | "NO_DISPLAY_NAME" | "NO_BGG_ID";

const STATE_FILTER_LABELS: Record<StateFilter, string> = {
  ALL: "Alle",
  NO_DISPLAY_NAME: "Ohne deutschen Namen",
  NO_BGG_ID: "Ohne BGG-ID",
};

function matchesState(row: AdminTagRow, filter: StateFilter) {
  if (filter === "NO_DISPLAY_NAME") return !row.displayName;
  if (filter === "NO_BGG_ID") return row.bggId === null;
  return true;
}

export function AdminTagsView({ rows }: { rows: AdminTagRow[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");

  const counts = useMemo(
    () => ({
      MECHANIC: rows.filter((row) => row.type === "MECHANIC").length,
      CATEGORY: rows.filter((row) => row.type === "CATEGORY").length,
      noBggId: rows.filter((row) => row.bggId === null).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter(
        (row) =>
          (!term ||
            row.name.toLowerCase().includes(term) ||
            row.displayName?.toLowerCase().includes(term)) &&
          (typeFilter === "ALL" || row.type === typeFilter) &&
          matchesState(row, stateFilter),
      )
      .sort((a, b) => tagLabel(a).localeCompare(tagLabel(b), "de"));
  }, [rows, search, typeFilter, stateFilter]);

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Administration"
        title="Mechaniken & Kategorien"
        description="Deutsche Anzeigenamen der BGG-Mechaniken und -Kategorien. Ohne eigenen Namen wird der BGG-Name angezeigt."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={TYPE_FILTER_LABELS.MECHANIC} value={counts.MECHANIC} />
        <StatTile label={TYPE_FILTER_LABELS.CATEGORY} value={counts.CATEGORY} />
        <StatTile label="Ohne BGG-ID" value={counts.noBggId} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_200px_200px]">
        <TextField
          id="tag-search"
          label="Suche"
          value={search}
          placeholder="BGG- oder deutscher Name"
          onChange={(event) => setSearch(event.target.value)}
        />
        <Field label="Typ" htmlFor="tag-type">
          <NativeSelect
            id="tag-type"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as TypeFilter)
            }
          >
            {(Object.keys(TYPE_FILTER_LABELS) as TypeFilter[]).map((type) => (
              <option key={type} value={type}>
                {TYPE_FILTER_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Zustand" htmlFor="tag-state">
          <NativeSelect
            id="tag-state"
            value={stateFilter}
            onChange={(event) =>
              setStateFilter(event.target.value as StateFilter)
            }
          >
            {(Object.keys(STATE_FILTER_LABELS) as StateFilter[]).map(
              (state) => (
                <option key={state} value={state}>
                  {STATE_FILTER_LABELS[state]}
                </option>
              ),
            )}
          </NativeSelect>
        </Field>
      </div>

      <p className="text-muted-foreground text-sm">
        {visible.length} von {rows.length} Einträgen
      </p>

      <ul className="flex flex-col gap-3">
        {visible.map((row) => (
          <TagAdminRow
            key={row.id}
            row={row}
            typeLabel={TAG_TYPE_LABELS[row.type]}
          />
        ))}
      </ul>
    </PageContainer>
  );
}
