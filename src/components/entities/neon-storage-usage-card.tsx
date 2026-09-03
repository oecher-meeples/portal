import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { formatBytes } from "@/lib/utils/format";
import { getStorageTone, type StorageTone } from "@/lib/utils/storage-tone";
import type { NeonStorageUsage } from "@/lib/admin/neon-storage";

const TONE_LABELS: Record<StorageTone, string> = {
  ok: "Im grünen Bereich",
  warning: "Wird knapp",
  critical: "Fast voll",
};

const TONE_TO_STATUS_TONE: Record<StorageTone, StatusTone> = {
  ok: "positive",
  warning: "warning",
  critical: "negative",
};

/** Admin-only info card showing the Neon Postgres storage fill level —
 * read-only, no mutation, so it lives here rather than in `feature/`
 * (analog `BlobStorageUsageCard`, #240). */
export function NeonStorageUsageCard({ usage }: { usage: NeonStorageUsage }) {
  const tone = getStorageTone(usage.percent);

  return (
    <div className="bg-card rounded-lg border p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Datenbank-Speicher
        </p>
        <StatusPill
          label={TONE_LABELS[tone]}
          tone={TONE_TO_STATUS_TONE[tone]}
        />
      </div>
      <p className="mt-2 font-serif text-3xl font-bold">
        {usage.percent.toFixed(1)} %
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        {formatBytes(usage.used)} von {formatBytes(usage.limit)} belegt
      </p>
      {/* #240: pg_database_size() misst nur diesen Branch (Production) —
       * das 0,5-GB-Kontingent gilt projektweit über alle Branches. */}
      <p className="text-muted-foreground mt-2 text-xs">
        Zeigt nur diesen Branch — das Kontingent gilt projektweit über alle
        Branches.
      </p>
    </div>
  );
}
