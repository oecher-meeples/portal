import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import type { InviteStatus } from "@/lib/members/invites";
import { INVITE_STATUS_LABELS } from "@/lib/utils/format";

const TONES: Record<InviteStatus, StatusTone> = {
  offen: "info",
  eingeloest: "positive",
  abgelaufen: "neutral",
  widerrufen: "negative",
};

/** The one place that knows how an invite status looks. */
export function InviteStatusPill({ status }: { status: InviteStatus }) {
  return (
    <StatusPill label={INVITE_STATUS_LABELS[status]} tone={TONES[status]} />
  );
}
