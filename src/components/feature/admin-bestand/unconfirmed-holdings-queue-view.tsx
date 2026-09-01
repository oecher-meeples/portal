"use client";

import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import { ActionButton } from "@/components/ui/action-button";
import { confirmHoldingForGamesManager } from "@/lib/ludothek/holding-actions";
import { formatDatePlain } from "@/lib/utils/format";
import type { UnconfirmedHoldingRow } from "@/lib/ludothek/unconfirmed-holdings-queue";

/** Spielewart-Antrags-Queue für offene, unbestätigte Übergaben (#290) — jede
 * Zeile bestätigt direkt per `confirmHoldingForGamesManager()`, ohne dass die
 * empfangende Person selbst tätig werden muss. */
export function UnconfirmedHoldingsQueueView({
  rows,
}: {
  rows: UnconfirmedHoldingRow[];
}) {
  return (
    <PageContainer className="gap-4">
      <PageHeading
        eyebrow="Bestandsverwaltung"
        title="Unbestätigte Übergaben"
        description="Offene Weitergaben, die die empfangende Person noch nicht bestätigt hat — als Spielewart kannst du sie direkt freigeben."
      />

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aktuell keine offenen unbestätigten Übergaben.
        </p>
      ) : (
        <ul className="bg-card flex flex-col divide-y rounded-lg border">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 p-4 text-sm"
            >
              <span>
                <Link
                  href={`/ludothek/${row.boardGameSlug}`}
                  className="hover:text-primary font-medium"
                >
                  {row.gameTitle}
                </Link>{" "}
                — {row.recipientName}
                <span className="text-muted-foreground text-xs">
                  {" "}
                  · seit {formatDatePlain(row.startedAt)}
                </span>
              </span>
              <ActionButton
                size="sm"
                action={confirmHoldingForGamesManager.bind(null, row.id)}
              >
                Bestätigen
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
