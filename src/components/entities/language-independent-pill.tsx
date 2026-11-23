import type { LanguageDependence } from "@prisma/client";
import { StatusPill } from "@/components/ui/status-pill";
import { isLanguageIndependent } from "@/lib/ludothek/language-dependence";

/** Zeigt "Sprachneutral" für Titel ohne notwendigen Spieltext (BGGs
 * `language_dependence`-Poll-Level 1, siehe #188). Rendert nichts für jedes
 * andere Level oder `null` (noch nicht erfasst) — kein Hinweis ist der
 * Normalfall, kein negatives Badge nötig. */
export function LanguageIndependentPill({
  languageDependence,
  className,
}: {
  languageDependence: LanguageDependence | null;
  className?: string;
}) {
  if (!isLanguageIndependent(languageDependence)) return null;

  return <StatusPill label="Sprachneutral" tone="info" className={className} />;
}
