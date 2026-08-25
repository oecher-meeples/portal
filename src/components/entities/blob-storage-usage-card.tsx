import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { formatBytes } from "@/lib/utils/format";
import {
  getBlobStorageTone,
  type BlobStorageTone,
  type BlobStorageUsage,
} from "@/lib/admin/blob-storage";

const TONE_LABELS: Record<BlobStorageTone, string> = {
  ok: "Im grünen Bereich",
  warning: "Wird knapp",
  critical: "Fast voll",
};

const TONE_TO_STATUS_TONE: Record<BlobStorageTone, StatusTone> = {
  ok: "positive",
  warning: "warning",
  critical: "negative",
};

/** Admin-only info card showing the Vercel Blob storage fill level — read-only,
 * no mutation, so it lives here rather than in `feature/`. */
export function BlobStorageUsageCard({ usage }: { usage: BlobStorageUsage }) {
  const tone = getBlobStorageTone(usage.percent);

  return (
    <div className="bg-card rounded-lg border p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Blob-Speicher
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
    </div>
  );
}
