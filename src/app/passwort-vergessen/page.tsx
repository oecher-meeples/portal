import { PageHeading } from "@/components/ui/page-heading";
import { PasswortVergessenForm } from "@/components/feature/passwort-vergessen/passwort-vergessen-form";

export default async function PasswortVergessenPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  // #324 (Live-Review-Ergänzung): E-Mail aus dem Login-Formular übernehmen
  // statt sie hier erneut eintippen zu lassen.
  const { email } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Mitgliederbereich"
        title="Passwort vergessen"
        description="Fordere einen Code an und vergib damit ein neues Passwort."
      />
      <PasswortVergessenForm initialEmail={email ?? ""} />
    </div>
  );
}
