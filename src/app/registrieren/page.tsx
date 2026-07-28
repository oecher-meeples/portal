import { PageHeading } from "@/components/shared/page-heading";
import { validateInviteToken } from "@/lib/invites";
import { RegisterForm } from "@/app/registrieren/register-form";

export default async function RegistrierenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const validation = token
    ? await validateInviteToken(token)
    : { valid: false as const, reason: "not_found" as const };
  const isValid = validation.valid;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Onboarding via Einladung"
        title="Konto einrichten"
        description={
          isValid
            ? "Dein Einladungslink wurde erkannt. Lege ein Passwort fest, um deinen Zugang zu aktivieren."
            : undefined
        }
      />
      {isValid ? (
        <RegisterForm token={token!} />
      ) : (
        <p className="text-muted-foreground rounded-md border border-dashed p-3 text-center text-sm">
          Token ungültig oder abgelaufen – bitte wende dich an einen Admin.
        </p>
      )}
    </div>
  );
}
