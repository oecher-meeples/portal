import { PageHeading } from "@/components/ui/page-heading";
import { PageContainer } from "@/components/ui/page-container";

export function ForbiddenView() {
  return (
    <PageContainer className="max-w-sm gap-6">
      <PageHeading
        eyebrow="Zugriff verweigert"
        title="Keine Berechtigung"
        description="Du hast nicht die nötigen Rechte, um diese Seite aufzurufen."
      />
    </PageContainer>
  );
}
