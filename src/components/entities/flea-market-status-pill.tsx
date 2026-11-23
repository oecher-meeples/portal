import type { FleaMarketItemStatus } from "@prisma/client";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { FLEA_MARKET_ITEM_STATUS_LABELS } from "@/lib/utils/format";

const TONES: Record<FleaMarketItemStatus, StatusTone> = {
  PENDING: "neutral",
  FOR_SALE: "positive",
  RESERVED: "warning",
  SOLD: "info",
  PAID_OUT: "info",
  RETURNED: "neutral",
  DONATED: "neutral",
};

/** The one place that knows how a flea-market item's status looks. */
export function FleaMarketStatusPill({
  status,
}: {
  status: FleaMarketItemStatus;
}) {
  return (
    <StatusPill
      label={FLEA_MARKET_ITEM_STATUS_LABELS[status]}
      tone={TONES[status]}
    />
  );
}
