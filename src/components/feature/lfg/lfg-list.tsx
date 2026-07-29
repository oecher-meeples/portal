import Link from "next/link";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { JoinLfgButton } from "@/components/feature/lfg/join-lfg-button";
import type { LfgStatus } from "@/lib/lfg";

export type LfgPostSummary = {
  id: string;
  title: string;
  gameTitle: string | null;
  dateLabel: string;
  location: string | null;
  creatorName: string;
  participantCount: number;
  maxParticipants: number;
  status: LfgStatus;
  isParticipant: boolean;
};

const STATUS_LABELS: Record<LfgStatus, string> = {
  offen: "Offen",
  voll: "Voll",
  abgelaufen: "Abgelaufen",
  geschlossen: "Geschlossen",
};

const STATUS_TONE: Record<LfgStatus, StatusTone> = {
  offen: "positive",
  voll: "warning",
  abgelaufen: "neutral",
  geschlossen: "neutral",
};

export function LfgList({
  posts,
  showExpiredHref,
  showingExpired,
}: {
  posts: LfgPostSummary[];
  showExpiredHref: string;
  showingExpired: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link href={showExpiredHref} className="text-primary w-fit text-sm hover:underline">
        {showingExpired ? "Nur aktuelle anzeigen" : "Auch vergangene anzeigen"}
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-card flex flex-col gap-3 rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/lfg/${post.id}`}
                  className="hover:text-primary font-serif text-lg font-semibold"
                >
                  {post.title}
                </Link>
                <p className="text-muted-foreground text-sm">
                  {post.dateLabel}
                  {post.location && ` · ${post.location}`}
                  {post.gameTitle && ` · ${post.gameTitle}`}
                </p>
              </div>
              <StatusPill
                label={STATUS_LABELS[post.status]}
                tone={STATUS_TONE[post.status]}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                {post.creatorName} · {post.participantCount}/{post.maxParticipants}
              </div>
              {post.isParticipant ? (
                <span className="text-muted-foreground text-sm">dabei</span>
              ) : (
                <JoinLfgButton
                  postId={post.id}
                  disabled={post.status !== "offen"}
                  label={post.status === "offen" ? "Mitspielen" : STATUS_LABELS[post.status]}
                />
              )}
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="text-muted-foreground col-span-full text-sm">
            Keine Gesuche in dieser Ansicht.
          </p>
        )}
      </div>
    </div>
  );
}
