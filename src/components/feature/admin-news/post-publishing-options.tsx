import type { NewsletterCategory } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NEWSLETTER_CATEGORIES,
  NEWSLETTER_CATEGORY_LABELS,
} from "@/lib/newsletter/labels";

const INSTAGRAM_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ausstehend",
  QUEUED: "In Warteschlange",
  POSTED: "Erfolgreich gepostet",
  FAILED: "Fehlgeschlagen",
};

/** Die Checkbox-/Versand-Optionen von `post-form.tsx` (intern, Instagram,
 * Newsletter, Entwurf-kopieren, Instagram-Status) — ausgelagert, damit
 * `post-form.tsx` unter dem Datei-Zeilenlimit bleibt. */
export function PostPublishingOptions({
  internal,
  onInternalChange,
  internalLocked,
  canEditInternal,
  instagram,
  onInstagramChange,
  sendAsNewsletter,
  onSendAsNewsletterChange,
  newsletterCategory,
  onNewsletterCategoryChange,
  isExistingDraft,
  copyDraft,
  onCopyDraftChange,
  instagramStatus,
  isRetrying,
  onRetry,
  postId,
}: {
  internal: boolean;
  onInternalChange: (value: boolean) => void;
  internalLocked: boolean;
  canEditInternal: boolean;
  instagram: boolean;
  onInstagramChange: (value: boolean) => void;
  sendAsNewsletter: boolean;
  onSendAsNewsletterChange: (value: boolean) => void;
  newsletterCategory: NewsletterCategory;
  onNewsletterCategoryChange: (value: NewsletterCategory) => void;
  isExistingDraft: boolean;
  copyDraft: boolean;
  onCopyDraftChange: (value: boolean) => void;
  instagramStatus: string | null | undefined;
  isRetrying: boolean;
  onRetry: () => void;
  postId?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={internal}
          disabled={internalLocked}
          onChange={(event) => onInternalChange(event.target.checked)}
        />
        Nur intern (nur für eingeloggte Mitglieder sichtbar)
        {internalLocked && (
          <span className="text-muted-foreground text-xs">
            (nur {canEditInternal ? "interne" : "öffentliche"} Beiträge erlaubt)
          </span>
        )}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={instagram}
          disabled={internal}
          onChange={(event) => onInstagramChange(event.target.checked)}
        />
        Auch auf Instagram teilen
        {internal && (
          <span className="text-muted-foreground text-xs">
            (nicht möglich für interne Beiträge)
          </span>
        )}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sendAsNewsletter}
          onChange={(event) => onSendAsNewsletterChange(event.target.checked)}
        />
        Als Newsletter versenden in
        {sendAsNewsletter && (
          <select
            value={newsletterCategory}
            onChange={(event) =>
              onNewsletterCategoryChange(
                event.target.value as NewsletterCategory,
              )
            }
            className="border-primary bg-background h-9 w-fit rounded-md border-2 px-3 text-sm"
          >
            {NEWSLETTER_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {NEWSLETTER_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        )}
      </label>
      {isExistingDraft && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={copyDraft}
            onChange={(event) => onCopyDraftChange(event.target.checked)}
          />
          Entwurf kopieren?
          <span className="text-muted-foreground text-xs">
            (legt beim Speichern einen neuen Beitrag an, der bestehende Entwurf
            bleibt unverändert)
          </span>
        </label>
      )}
      {instagramStatus && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="self-start">
            {INSTAGRAM_STATUS_LABELS[instagramStatus] ?? instagramStatus}
          </Badge>
          {instagramStatus === "FAILED" && postId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isRetrying}
              onClick={onRetry}
            >
              {isRetrying ? "Wird erneut versucht…" : "Erneut versuchen"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
