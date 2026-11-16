"use client";

import { useMemo, useState } from "react";
import type { ContributorRole } from "@prisma/client";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminContributorRow } from "@/lib/ludothek/taxonomy/contributor-admin-queries";
import { ContributorAdminRow } from "@/components/feature/admin-contributors/contributor-admin-row";
import { CONTRIBUTOR_ROLE_LABELS } from "@/lib/ludothek/taxonomy/contributor-labels";

const ROLE_FILTER_LABELS: Record<"ALL" | ContributorRole, string> = {
  ALL: "Alle Rollen",
  ...CONTRIBUTOR_ROLE_LABELS,
};

type SortOption = "name" | "titleCount";

const SORT_LABELS: Record<SortOption, string> = {
  name: "Alphabetisch",
  titleCount: "Nach Anzahl Titel",
};

export function AdminContributorsView({
  rows,
}: {
  rows: AdminContributorRow[];
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | ContributorRole>("ALL");
  const [sort, setSort] = useState<SortOption>("name");

  const roleCounts = useMemo(() => {
    const counts: Record<ContributorRole, number> = {
      AUTHOR: 0,
      ILLUSTRATOR: 0,
      PUBLISHER: 0,
    };
    for (const row of rows) {
      for (const role of row.roles) counts[role] += 1;
    }
    return counts;
  }, [rows]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter(
        (row) =>
          (!term || row.name.toLowerCase().includes(term)) &&
          (roleFilter === "ALL" || row.roles.includes(roleFilter)),
      )
      .sort((a, b) =>
        sort === "titleCount"
          ? b.titleCount - a.titleCount
          : a.name.localeCompare(b.name, "de"),
      );
  }, [rows, search, roleFilter, sort]);

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Administration"
        title="Mitwirkende"
        description="Verlage, Autoren und Illustratoren über alle Titel. Zusammenführen nur, wenn höchstens ein Eintrag eine BGG-ID hat."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Autoren" value={roleCounts.AUTHOR} />
        <StatTile label="Illustratoren" value={roleCounts.ILLUSTRATOR} />
        <StatTile label="Verlage" value={roleCounts.PUBLISHER} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_200px_200px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contributor-search">Suche</Label>
          <Input
            id="contributor-search"
            value={search}
            placeholder="Name eingeben"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contributor-role">Rolle</Label>
          <select
            id="contributor-role"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as "ALL" | ContributorRole)
            }
            className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
          >
            {(
              Object.keys(ROLE_FILTER_LABELS) as ("ALL" | ContributorRole)[]
            ).map((role) => (
              <option key={role} value={role}>
                {ROLE_FILTER_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contributor-sort">Sortierung</Label>
          <select
            id="contributor-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        {visible.length} von {rows.length} Einträgen
      </p>

      <ul className="flex flex-col gap-3">
        {visible.map((row) => (
          <ContributorAdminRow key={row.id} row={row} allRows={rows} />
        ))}
      </ul>
    </PageContainer>
  );
}
