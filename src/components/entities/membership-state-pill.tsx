import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import type { MembershipState } from "@/lib/members/meeples";
import { MEMBERSHIP_STATE_LABELS } from "@/lib/utils/format";

const TONES: Record<MembershipState, StatusTone> = {
  aktiv: "positive",
  gekuendigt: "warning",
  ausgetreten: "negative",
  anonymisiert: "neutral",
};

/** The one place that knows how a membership state looks. */
export function MembershipStatePill({ state }: { state: MembershipState }) {
  return (
    <StatusPill label={MEMBERSHIP_STATE_LABELS[state]} tone={TONES[state]} />
  );
}
