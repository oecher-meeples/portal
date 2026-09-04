"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { PageHeading } from "@/components/ui/page-heading";
import {
  PressHoldReveal,
  type RevealResult,
} from "@/components/ui/press-hold-reveal";
import { StatTile } from "@/components/ui/stat-tile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  revealIban,
  revealPendingIban,
} from "@/components/feature/admin-bank/actions";
import { BankCsvExportDialog } from "@/components/feature/admin-bank/bank-csv-export-dialog";
import {
  PendingChangesPanel,
  type PendingChangeRow,
} from "@/components/widgets/pending-changes/pending-changes-panel";
import { PageContainer } from "@/components/ui/page-container";

export type BankDataRow = {
  id: string;
  memberNumber: number;
  displayName: string;
  accountHolder: string | null;
  maskedIban: string;
  hasIban: boolean;
};

export type BankAccessLogRow = {
  id: string;
  at: string;
  kind: string;
  accessedBy: string;
  subject: string | null;
};

const KIND_LABELS: Record<string, string> = {
  SINGLE_REVEAL: "Einzelanzeige",
  CSV_EXPORT: "CSV-Export",
};

export function AdminBankView({
  rows,
  logs,
  pendingIbanChanges,
}: {
  rows: BankDataRow[];
  logs: BankAccessLogRow[];
  pendingIbanChanges: PendingChangeRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  // Pro Zeile ein eigener Aufdeck-Zustand — der aufgedeckte Wert löst die
  // maskierte IBAN direkt ab (siehe `press-hold-reveal.tsx`).
  const [revealedIbanByRowId, setRevealedIbanByRowId] = useState<
    Record<string, string | null>
  >({});

  async function revealRowIban(id: string): Promise<RevealResult> {
    const result = await revealIban(id);
    return "error" in result
      ? result
      : { success: true as const, value: result.iban };
  }

  const withIban = rows.filter((row) => row.hasIban).length;

  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Kassenwart"
        title="Beitragseinzug"
        description="Bankdaten liegen verschlüsselt. Jedes Aufdecken und jeder Export wird protokolliert."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Mitglieder" value={rows.length} hint="insgesamt" />
        <StatTile label="Mit Bankdaten" value={withIban} hint="einzugsfähig" />
        <StatTile
          label="Ohne Bankdaten"
          value={rows.length - withIban}
          hint="Nachpflege nötig"
        />
      </div>

      <PendingChangesPanel
        titleSingular="Offener IBAN-Änderungsantrag"
        titlePlural="Offene IBAN-Änderungsanträge"
        changes={pendingIbanChanges}
        revealIban={async (changeId) => {
          const result = await revealPendingIban(changeId);
          return "error" in result
            ? result
            : { success: true as const, value: result.iban };
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <BankCsvExportDialog ibanCount={withIban} />
        <p className="text-muted-foreground text-sm">
          Spalten: Mitgliedsnummer, Name, Kontoinhaber, IBAN. Kein SEPA-XML.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nr.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Kontoinhaber</TableHead>
            <TableHead>IBAN</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono">{row.memberNumber}</TableCell>
              <TableCell>{row.displayName}</TableCell>
              <TableCell>{row.accountHolder ?? "—"}</TableCell>
              <TableCell className="font-mono">
                <span className="inline-block w-[22ch]">
                  {revealedIbanByRowId[row.id] ?? row.maskedIban}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {row.hasIban && (
                  <span className="inline-flex items-center gap-2">
                    <PressHoldReveal
                      reveal={() => revealRowIban(row.id)}
                      onError={setError}
                      onValueChange={(value) =>
                        setRevealedIbanByRowId((prev) => ({
                          ...prev,
                          [row.id]: value,
                        }))
                      }
                    />
                    <CopyButton
                      value={() => revealRowIban(row.id)}
                      onError={setError}
                      label="Kopieren"
                      icon={Copy}
                    />
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="bg-card rounded-lg border p-5">
        <h2 className="font-serif text-lg font-bold">
          Zugriffsprotokoll (letzte Einträge)
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Aufbewahrung 24 Monate, danach automatisch gelöscht.
        </p>
        {logs.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            Noch keine Zugriffe protokolliert.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap gap-2 py-2">
                <span className="font-mono">{log.at}</span>
                <span>{KIND_LABELS[log.kind] ?? log.kind}</span>
                <span className="text-muted-foreground">
                  durch {log.accessedBy}
                  {log.subject ? ` · betrifft ${log.subject}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
