import { UserPlus, X } from "lucide-react";
import type { ProfilePictureVisibility } from "@prisma/client";
import { ActionButton } from "@/components/ui/action-button";
import { LfgStatusPill } from "@/components/entities/lfg-status-pill";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import {
  addLfgGuest,
  closeLfgPost,
  joinLfgPost,
  leaveLfgPost,
  removeLfgGuest,
} from "@/components/feature/lfg/actions";
import { LfgLocationEditor } from "@/components/feature/lfg/lfg-location-editor";
import {
  LfgAttachmentsSection,
  type LfgAttachmentRow,
} from "@/components/feature/lfg/lfg-attachments-section";
import type { LfgStatus } from "@/lib/content/lfg";
import type { ContactLinks } from "@/lib/members/contact";
import { PageContainer } from "@/components/ui/page-container";

export type LfgParticipantRow = {
  /** Teilnehmer-Zeilen-ID, immer gesetzt — auch für Gäste. */
  id: string;
  /** null = anonymer Gast (#145). */
  meepleId: string | null;
  displayName: string;
  /** null für Gäste und wenn der Betrachter nicht beigetreten ist (#167) —
   * serverseitig entschieden, hier nur gerendert. */
  contact: ContactLinks | null;
  /** (#412) Profilbild statt Initialen-Kreis, sofern vorhanden und laut
   * Freigabe (#389) sichtbar — `null` für Gäste (kein Meeple-Datensatz). */
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
  /** Wer entfernen darf (wer hinzugefügt hat, plus immer der Ersteller). */
  canRemove: boolean;
};

export function LfgDetailView({
  id,
  title,
  gameTitle,
  dateLabel,
  location,
  description,
  status,
  maxParticipants,
  participants,
  createdByMeepleId,
  viewerMeepleId,
  canClose,
  guestsMayBringGuests,
  canEditLocation,
  viewerHasOwnAddress,
  attachments,
}: {
  id: string;
  title: string;
  gameTitle: string | null;
  dateLabel: string;
  location: string | null;
  description: string;
  status: LfgStatus;
  maxParticipants: number;
  participants: LfgParticipantRow[];
  createdByMeepleId: string;
  viewerMeepleId: string | null;
  canClose: boolean;
  guestsMayBringGuests: boolean;
  /** Ersteller darf das Ortsfeld immer bearbeiten, beigetretene Teilnehmer
   * nur bei aktivem `participantsMayEditLocation` (#166) — serverseitig
   * entschieden, hier nur gerendert. */
  canEditLocation: boolean;
  /** Ob der Betrachter eine Adresse im Profil hinterlegt hat — steuert, ob
   * "Meine Adresse übernehmen" am Ortsfeld erscheint (#166). */
  viewerHasOwnAddress: boolean;
  /** `undefined` = Datei-Bereich wird nicht angezeigt — weder Teilnehmer
   * noch `isLfgAttachmentEligible()` (#283), serverseitig entschieden. */
  attachments?: LfgAttachmentRow[];
}) {
  const isParticipant = participants.some((p) => p.meepleId === viewerMeepleId);
  const isCreator = viewerMeepleId === createdByMeepleId;
  const canAddGuest =
    status === "offen" &&
    (isCreator || (guestsMayBringGuests && isParticipant));

  return (
    <PageContainer className="max-w-2xl gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">
            {dateLabel}
            {!canEditLocation && location && ` · ${location}`}
            {gameTitle && ` · ${gameTitle}`}
          </p>
        </div>
        <LfgStatusPill status={status} />
      </div>

      {canEditLocation && (
        <LfgLocationEditor
          key={location ?? ""}
          postId={id}
          initialLocation={location}
          hasOwnAddress={viewerHasOwnAddress}
        />
      )}

      <p className="leading-relaxed">{description}</p>

      <div className="bg-card rounded-lg border p-5">
        <h2 className="font-serif text-lg font-bold">
          Teilnehmende ({participants.length}/{maxParticipants})
        </h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {participants.map((participant) => (
            <li
              key={participant.id}
              className="flex items-center gap-2.5 text-sm"
            >
              <MeepleAvatar
                name={participant.displayName}
                profilePictureUrl={participant.profilePictureUrl}
                profilePictureVisibility={participant.profilePictureVisibility}
                viewer={{ kind: "meeple" }}
              />
              {participant.contact ? (
                <ContactDialog
                  name={participant.displayName}
                  contact={participant.contact}
                />
              ) : (
                participant.displayName
              )}
              {participant.meepleId === createdByMeepleId && (
                <span className="text-muted-foreground text-xs">
                  (Ersteller)
                </span>
              )}
              {participant.canRemove && (
                <ActionButton
                  variant="destructive"
                  size="icon-xs"
                  className="ml-auto"
                  action={removeLfgGuest.bind(null, participant.id)}
                  aria-label={`"${participant.displayName}" entfernen`}
                >
                  <X className="size-3.5" />
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
        {canAddGuest && (
          <ActionButton
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            action={addLfgGuest.bind(null, id)}
            pendingLabel="Füge hinzu…"
          >
            <UserPlus className="size-4" />
            Gast hinzufügen
          </ActionButton>
        )}
      </div>

      {attachments && (
        <LfgAttachmentsSection postId={id} attachments={attachments} />
      )}

      <div className="flex flex-wrap gap-3">
        {!isParticipant && (
          <ActionButton
            action={joinLfgPost.bind(null, id)}
            disabled={status !== "offen"}
            pendingLabel="Trage ein…"
            wrapperClassName="items-start"
            errorClassName="max-w-none text-left"
          >
            Beitreten
          </ActionButton>
        )}
        {isParticipant && !isCreator && (
          <ActionButton
            variant="outline"
            action={leaveLfgPost.bind(null, id)}
            pendingLabel="Verlasse…"
          >
            Verlassen
          </ActionButton>
        )}
        {canClose && status !== "geschlossen" && (
          <ActionButton
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            action={closeLfgPost.bind(null, id)}
            pendingLabel="Schließe…"
          >
            Gesuch schließen
          </ActionButton>
        )}
      </div>
    </PageContainer>
  );
}
