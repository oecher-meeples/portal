import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { requireMember } from "@/lib/auth/session";
import {
  AUSLEIHE_ROLE_NAME,
  findActiveShiftEvent,
} from "@/lib/events/shift-rights";
import { AusleiheView } from "@/components/feature/event-ausleihe/ausleihe-view";

export default async function AusleihePage() {
  const { meeple } = await requireMember();

  const activeShift = await findActiveShiftEvent(meeple.id, AUSLEIHE_ROLE_NAME);
  if (!activeShift) {
    redirect("/403");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title="Ausleihe & Rückgabe"
        description="Scannen statt Tippen — nur nutzbar während einer besetzten Ausleihe-Schicht."
      />
      <AusleiheView />
    </div>
  );
}
