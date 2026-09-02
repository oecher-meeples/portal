import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Umfrage-spezifische Felder von `post-form.tsx`, nur bei `type: "umfrage"`
 * gerendert (#2) — ausgelagert, damit `post-form.tsx` unter dem
 * Datei-Zeilenlimit bleibt. `editLink`/`analysisLink` sind sensibel: nur im
 * Admin-Editor sichtbar, nie auf `/news` (siehe post-permissions.ts). */
export function SurveyFields({
  deadline,
  onDeadlineChange,
  editLink,
  onEditLinkChange,
  analysisLink,
  onAnalysisLinkChange,
}: {
  deadline: string;
  onDeadlineChange: (value: string) => void;
  editLink: string;
  onEditLinkChange: (value: string) => void;
  analysisLink: string;
  onAnalysisLinkChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="surveyDeadline">Deadline</Label>
        <Input
          id="surveyDeadline"
          type="date"
          value={deadline}
          onChange={(event) => onDeadlineChange(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="surveyEditLink">Bearbeiten-/Auswertungslink</Label>
        <span className="text-muted-foreground text-xs">
          Pflichtfeld bei Veröffentlichung, im Entwurf optional
        </span>
        <Input
          id="surveyEditLink"
          type="url"
          value={editLink}
          onChange={(event) => onEditLinkChange(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="surveyAnalysisLink">
          Auswertungslink (falls abweichend)
        </Label>
        <Input
          id="surveyAnalysisLink"
          type="url"
          value={analysisLink}
          onChange={(event) => onAnalysisLinkChange(event.target.value)}
        />
      </div>
      <p className="text-muted-foreground text-xs sm:col-span-2">
        Diese Felder sind nur im Admin-Editor sichtbar, nie auf /news. Der
        eigentliche Umfrage-Link gehört als normaler Link in den Inhalt oben.
      </p>
    </div>
  );
}
