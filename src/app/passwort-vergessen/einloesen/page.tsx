import { PageHeading } from "@/components/ui/page-heading";
import { PasswortEinloesenForm } from "@/components/feature/passwort-vergessen/passwort-einloesen-form";

export default async function PasswortEinloesenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Mitgliederbereich"
        title="Neues Passwort festlegen"
        description="Über den Link aus deiner E-Mail."
      />
      <PasswortEinloesenForm token={token ?? null} />
    </div>
  );
}
