import { requireMember } from "@/lib/session";
import { PageHeading } from "@/components/ui/page-heading";
import { LFG_REQUESTS } from "@/data/lfg";
import { LfgList } from "@/components/feature/lfg/lfg-list";
import { CreateLfgDialog } from "@/components/feature/lfg/create-lfg-dialog";

export default async function LfgPage() {
  await requireMember();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Schwarzes Brett"
        title="Spielergesuche (LFG)"
        description="Finde Mitspielende â€“ fÃ¼r ein bestimmtes Spiel oder einfach spontan fÃ¼r einen Abend."
        action={<CreateLfgDialog />}
      />
      <LfgList requests={LFG_REQUESTS} />
    </div>
  );
}
