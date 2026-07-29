import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { JoinLfgButton } from "@/components/feature/lfg/join-lfg-button";
import { LeaveLfgButton } from "@/components/feature/lfg/leave-lfg-button";
import { CloseLfgButton } from "@/components/feature/lfg/close-lfg-button";
import type { LfgStatus } from "@/lib/lfg";

const STATUS_LABELS: Record<LfgStatus, string> = {
  offen: "Offen",
  voll: "Gesuch voll",
  abgelaufen: "Abgelaufen",
  geschlossen: "Geschlossen",
};

const STATUS_TONE: Record<LfgStatus, StatusTone> = {
  offen: "positive",
  voll: "warning",
  abgelaufen: "neutral",
  geschlossen: "neutral",
};

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
        <StatusPill label={STATUS_LABELS[status]} tone={STATUS_TONE[status]} />
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
                <span className="text-muted-foreground text-xs">(Ersteller)</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        {!isParticipant && (
          <JoinLfgButton postId={id} disabled={status !== "offen"} label="Beitreten" />
        )}
        {isParticipant && !isCreator && <LeaveLfgButton postId={id} />}
        {canClose && status !== "geschlossen" && <CloseLfgButton postId={id} />}
      </div>
    </div>
  );
}
