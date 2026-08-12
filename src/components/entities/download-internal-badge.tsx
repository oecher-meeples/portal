import Image from "next/image";
import type { DownloadStatus } from "@prisma/client";
import { Tooltip } from "@/components/ui/tooltip";

/** Meeple badge marking a download as members-only (see #116). Renders
 * nothing outside `INTERNAL` — `PUBLIC`/`OFFLINE` downloads carry no badge. */
export function DownloadInternalBadge({ status }: { status: DownloadStatus }) {
  if (status !== "INTERNAL") return null;

  return (
    <Tooltip content="Nur für Mitglieder">
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400">
        <Image
          src="/meeple.png"
          alt="Nur für Mitglieder"
          width={14}
          height={14}
          className="size-3.5 brightness-0 invert"
        />
      </span>
    </Tooltip>
  );
}
