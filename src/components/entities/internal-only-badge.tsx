import Image from "next/image";
import { Tooltip } from "@/components/ui/tooltip";

/** Meeple badge marking content as internal/members-only, shared by downloads
 * and admin-news (see #116). */
export function InternalOnlyBadge({
  tooltip = "Nur intern sichtbar",
}: {
  tooltip?: string;
}) {
  return (
    <Tooltip content={tooltip}>
      <Image
        src="/icons/meeple-150x150.png"
        alt={tooltip}
        width={16}
        height={16}
        className="size-4 shrink-0"
      />
    </Tooltip>
  );
}
