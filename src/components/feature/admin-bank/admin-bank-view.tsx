"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportBankDataCsv, revealIban } from "@/components/feature/admin-bank/actions";

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

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminBankView({
  rows,
  logs,
}: {
  rows: BankDataRow[];
  logs: BankAccessLogRow[];
}) {
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleReveal(id: string) {
    setBusyId(id);
    setError(null);

    const result = await revealIban(id);
    setBusyId(null);

    if (result.error) {
      setError(result.error);
      return;
    }
    setRevealed((current) => ({ ...current, [id]: result.iban! }));
  }

  async function handleExport() {
    setIsExporting(true);
    setError(null);

    const result = await exportBankDataCsv();
    setIsExporting(false);

    downloadCsv(result.filename, result.csv);
  }

  const withIban = rows.filter((row) => row.hasIban).length;

  return (
    <div className="flex flex-col gap-6">
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

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleExport} disabled={isExporting || withIban === 0}>
          {isExporting ? "Erzeuge CSV…" : "CSV für die Banking-Software"}
        </Button>
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
                {revealed[row.id] ?? row.maskedIban}
              </TableCell>
              <TableCell className="text-right">
                {row.hasIban && !revealed[row.id] && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === row.id}
                    onClick={() => handleReveal(row.id)}
                  >
                    {busyId === row.id ? "Decke auf…" : "IBAN aufdecken"}
                  </Button>
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
    </div>
  );
}
