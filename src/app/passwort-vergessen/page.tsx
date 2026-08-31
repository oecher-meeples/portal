import { PageHeading } from "@/components/ui/page-heading";
import { PasswortVergessenForm } from "@/components/feature/passwort-vergessen/passwort-vergessen-form";

export default function PasswortVergessenPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Mitgliederbereich"
        title="Passwort vergessen"
        description="Fordere einen Code an und vergib damit ein neues Passwort."
      />
      <PasswortVergessenForm />
    </div>
  );
}
