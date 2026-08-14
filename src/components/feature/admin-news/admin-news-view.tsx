"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateShort } from "@/lib/utils/format";
import { InternalOnlyBadge } from "@/components/entities/internal-only-badge";
import { getContentTypeIcon } from "@/components/entities/content-type-icon";
import { Tooltip } from "@/components/ui/tooltip";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { ActionButton } from "@/components/ui/action-button";
import { PillToggle, type PillOption } from "@/components/ui/pill-toggle";
import {
  TriStateFilter,
  type TriState,
} from "@/components/ui/tri-state-filter";
import {
  CONTENT_TYPE_FILTERS,
  DB_TO_TYPE,
  TYPE_TO_DB,
  type ContentType,
} from "@/lib/content/content";
import { deletePost } from "@/components/feature/admin-news/actions";

const TYPE_FILTER_OPTIONS: PillOption<ContentType | "alle">[] =
  CONTENT_TYPE_FILTERS.map((option) => ({
    ...option,
    icon: getContentTypeIcon(option.value),
  }));

const TYPE_LABELS: Record<ContentType, string> = {
  termin: "Termin",
  blog: "Blog",
  turnier: "Turnier",
};

/** Prüft ein boolesches Merkmal (z. B. `post.internal`) gegen einen
 * Drei-Zustands-Filter: "nur" verlangt `true`, "keine" verlangt `false`. */
function matchesTriState(triState: TriState, flag: boolean | null): boolean {
  if (triState === "nur") return Boolean(flag);
  if (triState === "keine") return !flag;
  return true;
}

export type AdminNewsPostRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  date: string;
  internal: boolean | null;
  instagram: boolean | null;
  status: string;
};

export function AdminNewsView({ posts }: { posts: AdminNewsPostRow[] }) {
  const [filter, setFilter] = useState<ContentType | "alle">("alle");
  const [titleQuery, setTitleQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [internalFilter, setInternalFilter] = useState<TriState>("alle");
  const [instagramFilter, setInstagramFilter] = useState<TriState>("alle");

  const visible = posts
    .filter((post) => filter === "alle" || TYPE_TO_DB[filter] === post.type)
    .filter((post) =>
      post.title.toLowerCase().includes(titleQuery.trim().toLowerCase()),
    )
    .filter((post) => !dateFrom || post.date >= dateFrom)
    .filter((post) => !dateTo || post.date <= dateTo)
    .filter((post) => matchesTriState(internalFilter, post.internal))
    .filter((post) => matchesTriState(instagramFilter, post.instagram));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Redaktion"
        title="Beiträge"
        description="Blog, Termine und Turniere verwalten."
        action={
          <Button
            render={<Link href="/admin/news/new">+ Neuer Beitrag</Link>}
          />
        }
      />

      <div className="flex flex-col gap-3">
        <PillToggle
          options={TYPE_FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
        <div className="flex flex-wrap items-end gap-3">
          <TextField
            id="title-search"
            label="Titel"
            type="search"
            placeholder="Suche nach Titel…"
            value={titleQuery}
            onChange={(event) => setTitleQuery(event.target.value)}
            onClear={() => setTitleQuery("")}
            fieldClassName="w-64"
          />
          <TextField
            id="date-from"
            label="Von"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            onClear={() => setDateFrom("")}
          />
          <TextField
            id="date-to"
            label="Bis"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            onClear={() => setDateTo("")}
          />
          <TriStateFilter
            label="Intern"
            value={internalFilter}
            onChange={setInternalFilter}
            itemLabels={{
              alle: "Alle anzeigen",
              nur: "Nur interne anzeigen",
              keine: "Keine internen anzeigen",
            }}
          />
          <TriStateFilter
            label="Instagram"
            value={instagramFilter}
            onChange={setInstagramFilter}
            itemLabels={{
              alle: "Alle anzeigen",
              nur: "Nur Instagram-markierte anzeigen",
              keine: "Keine Instagram-markierten anzeigen",
            }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Titel</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((post) => {
              const contentType =
                DB_TO_TYPE[post.type as "BLOG" | "TERMIN" | "TURNIER"];
              const typeLabel = TYPE_LABELS[contentType];
              const TypeIcon = getContentTypeIcon(contentType);
              return (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/news/${post.slug}`}
                        className="hover:text-primary hover:underline"
                      >
                        {post.title}
                      </Link>
                      {post.status === "DRAFT" && (
                        <Badge variant="secondary">Entwurf</Badge>
                      )}
                      {post.internal && <InternalOnlyBadge />}
                      {post.instagram && (
                        <Tooltip content="Für Instagram markiert">
                          <InstagramIcon
                            role="img"
                            aria-label="Für Instagram markiert"
                            className="text-muted-foreground size-4 shrink-0"
                          />
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Tooltip content={typeLabel}>
                      <span className="inline-flex items-center gap-1.5">
                        <TypeIcon
                          role="img"
                          aria-label={typeLabel}
                          className="text-accent size-4"
                        />
                        {typeLabel}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateShort(post.date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/admin/news/${post.id}/edit`}>
                            <Pencil className="size-4" />
                            Bearbeiten
                          </Link>
                        }
                      />
                      <ActionButton
                        variant="destructive"
                        size="sm"
                        confirm="Beitrag wirklich löschen?"
                        action={deletePost.bind(null, post.id)}
                      >
                        <Trash2 className="size-4" />
                        Löschen
                      </ActionButton>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
