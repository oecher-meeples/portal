import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";
import { cn } from "@/lib/utils/cn";

/** Fachfreie Verknüpfungs-Karte (Icon + Label), z. B. für "Schnellaktionen"
 * auf dem Admin-Dashboard oder Bereichs-Karten auf `admin/bestand`. */
export function QuickActionCard({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "bg-card flex flex-col items-center gap-2 rounded-lg border p-6 text-center",
        CARD_HOVER_CLASS,
      )}
    >
      <Icon className="text-primary size-6" />
      <span className="font-serif text-sm font-semibold">{label}</span>
    </Link>
  );
}
