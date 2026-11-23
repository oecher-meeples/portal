import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { requireMember } from "@/lib/auth/session";
import {
  AUSLEIHE_ROLE_NAME,
  findActiveShiftEvent,
} from "@/lib/events/shift-rights";
import { AusleiheView } from "@/components/feature/event-ausleihe/ausleihe-view";
import { PrivateLoansPanel } from "@/components/feature/event-ausleihe/private-loans-panel";
import { listOfferedPrivateLoansForEvent } from "@/lib/ludothek/private-event-loans";

export default async function AusleihePage() {
  const { meeple } = await requireMember();

  const activeShift = await findActiveShiftEvent(meeple.id, AUSLEIHE_ROLE_NAME);
  if (!activeShift) {
    redirect("/403");
  }

  // (#122) Private Exemplare sind event-, nicht exemplargebunden — daher
  // hier server-seitig geladen statt über den Scanner-Flow in AusleiheView.
  const offeredPrivateLoans = await listOfferedPrivateLoansForEvent(
    activeShift.eventId,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title="Ausleihe & Rückgabe"
        description="Scannen statt Tippen — nur nutzbar während einer besetzten Ausleihe-Schicht."
      />
      <AusleiheView />
      <PrivateLoansPanel loans={offeredPrivateLoans} />
    </div>
  );
}
