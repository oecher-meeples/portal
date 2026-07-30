import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import type { LfgStatus } from "@/lib/content/lfg";

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

export function lfgStatusLabel(status: LfgStatus) {
  return STATUS_LABELS[status];
}

/** The one place that knows how an LFG post's status looks. */
export function LfgStatusPill({ status }: { status: LfgStatus }) {
  return (
    <StatusPill label={STATUS_LABELS[status]} tone={STATUS_TONE[status]} />
  );
}
