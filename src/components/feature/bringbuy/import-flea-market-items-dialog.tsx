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
import { Label } from "@/components/ui/label";
import { FileField } from "@/components/ui/file-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseFleaMarketCsv } from "@/lib/bringbuy/csv";
import { importFleaMarketItemsCsv } from "@/components/feature/bringbuy/import-actions";
import type { FleaMarketEventOption } from "@/components/feature/bringbuy/create-flea-market-item-dialog";

export function ImportFleaMarketItemsDialog({
  events,
}: {
  events: FleaMarketEventOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ReturnType<
    typeof parseFleaMarketCsv
  > | null>(null);
  const [summary, setSummary] = useState<{ created: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setRaw("");
    setPreview(null);
    setSummary(null);
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setRaw(text);
    setPreview(parseFleaMarketCsv(text));
    setSummary(null);
  }

  async function handleImport() {
    setIsSubmitting(true);
    const result = await importFleaMarketItemsCsv(eventId, raw);
    setIsSubmitting(false);
    setSummary({ created: result.created });
    router.refresh();
  }

  if (events.length === 0) return null;

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
          <DialogTitle>Artikel per CSV importieren</DialogTitle>
          <DialogDescription>
            Spalten: title,price,description (description optional). Alle Zeilen
            werden als eigene Artikel im Status „Wartet auf Freigabe“ angelegt.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="import-event">Event</Label>
          <select
            id="import-event"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} · {event.dateLabel}
              </option>
            ))}
          </select>
        </div>

        <FileField
          id="import-file"
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
              {preview.items.length} gültige Zeile(n), {preview.errors.length}{" "}
              Fehler
            </p>
            <div className="max-h-48 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Preis</TableHead>
                    <TableHead>Beschreibung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.items.map((item, index) => (
                    <TableRow key={`${item.title}-${index}`}>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.priceEuros} €</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description ?? "—"}
                      </TableCell>
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
          <p className="text-sm">{summary.created} Artikel angelegt.</p>
        )}

        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={
              isSubmitting || !preview || preview.items.length === 0 || !eventId
            }
          >
            {isSubmitting ? "Importiere…" : "Import bestätigen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
