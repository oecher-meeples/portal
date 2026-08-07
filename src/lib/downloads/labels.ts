import type { DownloadStatus } from "@prisma/client";

/**
 * German wording for the DownloadStatus enum lives here — it is domain
 * vocabulary. How a state *looks* (colour/tone) is a display concern and
 * lives in src/components/entities/download-status-pill.tsx instead.
 */
export const DOWNLOAD_STATUS_LABELS: Record<DownloadStatus, string> = {
  PUBLIC: "Öffentlich",
  INTERNAL: "Intern",
  OFFLINE: "Offline",
};
