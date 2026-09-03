import Link from "next/link";
import { ActionButton } from "@/components/ui/action-button";
import {
  LfgStatusPill,
  lfgStatusLabel,
} from "@/components/entities/lfg-status-pill";
import { joinLfgPost } from "@/components/feature/lfg/actions";
import type { LfgStatus } from "@/lib/content/lfg";

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

export function LfgList({ posts }: { posts: LfgPostSummary[] }) {
  return (
    <div className="flex flex-col gap-4">
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
              <LfgStatusPill status={post.status} />
            </div>
            <div className="mt-auto flex items-center justify-between gap-3">
              <div className="text-sm">
                {post.creatorName} · {post.participantCount}/
                {post.maxParticipants}
              </div>
              {post.isParticipant ? (
                <span className="text-muted-foreground text-sm">dabei</span>
              ) : (
                <ActionButton
                  size="sm"
                  action={joinLfgPost.bind(null, post.id)}
                  disabled={post.status !== "offen"}
                  pendingLabel="Trage ein…"
                  wrapperClassName="items-start"
                  errorClassName="max-w-none text-left"
                >
                  {post.status === "offen"
                    ? "Mitspielen"
                    : lfgStatusLabel(post.status)}
                </ActionButton>
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
