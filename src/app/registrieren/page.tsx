import { PageHeading } from "@/components/ui/page-heading";
import { RegisterForm } from "@/components/feature/registrieren/register-form";

export default async function RegistrierenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Onboarding via Einladung"
        title="Konto einrichten"
        description="Trage deinen Einladungs-Token ein und lege ein Passwort fest, um deinen Zugang zu aktivieren."
      />
      <RegisterForm defaultToken={token} />
    </div>
  );
}
