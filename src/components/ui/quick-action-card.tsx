import Link from "next/link";
import type { LucideIcon } from "lucide-react";

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
      className="bg-card hover:border-primary/60 flex flex-col items-center gap-2 rounded-lg border p-6 text-center transition-colors"
    >
      <Icon className="text-primary size-6" />
      <span className="font-serif text-sm font-semibold">{label}</span>
    </Link>
  );
}
