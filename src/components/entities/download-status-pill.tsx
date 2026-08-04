import type { DownloadStatus } from "@prisma/client";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { DOWNLOAD_STATUS_LABELS } from "@/lib/downloads/labels";

const TONES: Record<DownloadStatus, StatusTone> = {
  PUBLIC: "positive",
  INTERNAL: "info",
  OFFLINE: "neutral",
};

/** The one place that knows how a download's status looks. */
export function DownloadStatusPill({ status }: { status: DownloadStatus }) {
  return (
    <StatusPill label={DOWNLOAD_STATUS_LABELS[status]} tone={TONES[status]} />
  );
}
