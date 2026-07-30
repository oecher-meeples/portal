import { PageHeading } from "@/components/ui/page-heading";

export function ForbiddenView() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Zugriff verweigert"
        title="Keine Berechtigung"
        description="Du hast nicht die nötigen Rechte, um diese Seite aufzurufen."
      />
    </div>
  );
}
