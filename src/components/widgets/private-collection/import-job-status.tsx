"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PrivateCollectionImportStatus } from "@prisma/client";

export type ImportJobSummary = {
  status: PrivateCollectionImportStatus;
  importedCount: number | null;
  error: string | null;
};

const POLL_INTERVAL_MS = 5000;

/** Zustand des letzten BGG-Imports (#632). Solange der Job wartet/läuft,
 * lädt die Seite alle paar Sekunden die Serverdaten neu — der Import selbst
 * läuft serverseitig weiter, auch wenn die Seite verlassen wird. */
export function isImportActive(job: ImportJobSummary | null) {
  return job?.status === "PENDING" || job?.status === "RUNNING";
}

export function ImportJobStatus({ job }: { job: ImportJobSummary | null }) {
  const router = useRouter();
  const active = isImportActive(job);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active, router]);

  if (!job) return null;
  if (active) {
    return (
      <p className="text-muted-foreground text-sm">
        Import läuft im Hintergrund — du kannst die Seite verlassen.
      </p>
    );
  }
  if (job.status === "FAILED") {
    return (
      <p className="text-destructive text-sm">
        Letzter Import fehlgeschlagen: {job.error ?? "Unbekannter Fehler."}
      </p>
    );
  }
  const count = job.importedCount ?? 0;
  return (
    <p className="text-sm text-emerald-600">
      Letzter Import: {count} {count === 1 ? "Spiel" : "Spiele"} importiert.
    </p>
  );
}
