import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type HelperGuideLink = {
  roleId: string;
  roleName: string;
  /** Signierte URL der PDF-Anleitung (#672). */
  url: string;
};

/** Download-Bereich im Helferplan-Header (#672): ein Button je Rolle mit
 * Anleitung, öffnet das PDF in einem neuen Tab. Ohne Anleitungen entfällt
 * der ganze Bereich. */
export function HelperGuideDownloads({
  guides,
}: {
  guides: HelperGuideLink[];
}) {
  if (guides.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {guides.map((guide) => (
        <Button
          key={guide.roleId}
          variant="outline"
          size="sm"
          className="gap-1.5"
          render={
            <a href={guide.url} target="_blank" rel="noopener noreferrer">
              <FileDown className="size-4" />
              Anleitung {guide.roleName} herunterladen
            </a>
          }
        />
      ))}
    </div>
  );
}
