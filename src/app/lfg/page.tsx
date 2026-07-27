import { RoleGate } from "@/components/shared/role-gate";
import { PageHeading } from "@/components/shared/page-heading";
import { LFG_REQUESTS } from "@/data/lfg";
import { LfgList } from "@/app/lfg/lfg-list";
import { CreateLfgDialog } from "@/app/lfg/create-lfg-dialog";

export default function LfgPage() {
  return (
    <RoleGate minRole="mitglied">
      <div className="flex flex-col gap-6">
        <PageHeading
          eyebrow="Schwarzes Brett"
          title="Spielergesuche (LFG)"
          description="Finde Mitspielende – für ein bestimmtes Spiel oder einfach spontan für einen Abend."
          action={<CreateLfgDialog />}
        />
        <LfgList requests={LFG_REQUESTS} />
      </div>
    </RoleGate>
  );
}
