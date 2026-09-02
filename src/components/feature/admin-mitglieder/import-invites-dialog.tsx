"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileField } from "@/components/ui/file-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseInviteCsv } from "@/lib/members/invite-csv";
import { bulkImportInvites } from "@/components/feature/admin-mitglieder/invite-actions";

/** CSV-Bulk-Einladung (#265) — Muster analog
 * `ImportFleaMarketItemsDialog`: Upload → Vorschau → Bestätigung →
 * Server-Action. Der Versand selbst (Link kopieren/per Mail) läuft danach
 * über die bestehenden Zeilen-Aktionen in `InvitesSection`, nicht hier
 * verdoppelt. */
export function ImportInvitesDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ReturnType<
    typeof parseInviteCsv
  > | null>(null);
  const [summary, setSummary] = useState<{
    created: number;
    errors: { email: string; message: string }[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setPreview(null);
    setSummary(null);
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setPreview(parseInviteCsv(text));
    setSummary(null);
  }

  async function handleImport() {
    if (!preview) return;
    setIsSubmitting(true);
    const result = await bulkImportInvites(preview.emails);
    setIsSubmitting(false);
    setSummary(result);
    if (result.created > 0) router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <Upload className="size-4" />
            CSV-Import
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Einladungen per CSV importieren</DialogTitle>
          <DialogDescription>
            Spalte: email. Jede Zeile muss zu einem bestehenden Mitglied ohne
            Portal-Login gehören.
          </DialogDescription>
        </DialogHeader>

        <FileField
          id="import-invites-file"
          label="CSV-Datei"
          accept=".csv,text/csv"
          onFilesSelected={(files) => {
            const file = files[0];
            if (file) void handleFile(file);
          }}
        />

        {preview && (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              {preview.emails.length} gültige Zeile(n), {preview.errors.length}{" "}
              Fehler
            </p>
            <div className="max-h-48 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-Mail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.emails.map((email) => (
                    <TableRow key={email}>
                      <TableCell>{email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.errors.length > 0 && (
              <ul className="text-destructive text-sm">
                {preview.errors.map((error) => (
                  <li key={error.line}>{error.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {summary && (
          <div className="flex flex-col gap-1">
            <p className="text-sm">{summary.created} Einladung(en) erstellt.</p>
            {summary.errors.length > 0 && (
              <ul className="text-destructive text-sm">
                {summary.errors.map((error) => (
                  <li key={error.email}>
                    {error.email}: {error.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={isSubmitting || !preview || preview.emails.length === 0}
          >
            {isSubmitting ? "Importiere…" : "Import bestätigen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
