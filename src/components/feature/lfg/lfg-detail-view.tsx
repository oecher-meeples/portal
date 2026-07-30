import { ActionButton } from "@/components/ui/action-button";
import { LfgStatusPill } from "@/components/entities/lfg-status-pill";
import {
  closeLfgPost,
  joinLfgPost,
  leaveLfgPost,
} from "@/components/feature/lfg/actions";
import type { LfgStatus } from "@/lib/content/lfg";

export type LfgParticipantRow = { meepleId: string; displayName: string };

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
}) {
  const isParticipant = participants.some((p) => p.meepleId === viewerMeepleId);
  const isCreator = viewerMeepleId === createdByMeepleId;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">
            {dateLabel}
            {location && ` · ${location}`}
            {gameTitle && ` · ${gameTitle}`}
          </p>
        </div>
        <LfgStatusPill status={status} />
      </div>

      <p className="leading-relaxed">{description}</p>

      <div className="bg-card rounded-lg border p-5">
        <h2 className="font-serif text-lg font-bold">
          Teilnehmende ({participants.length}/{maxParticipants})
        </h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {participants.map((participant) => (
            <li
              key={participant.meepleId}
              className="flex items-center gap-2.5 text-sm"
            >
              <span className="bg-muted flex size-8 items-center justify-center rounded-full font-semibold">
                {participant.displayName[0]?.toUpperCase()}
              </span>
              {participant.displayName}
              {participant.meepleId === createdByMeepleId && (
                <span className="text-muted-foreground text-xs">
                  (Ersteller)
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

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
    </div>
  );
}
