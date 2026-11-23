import { PageHeading } from "@/components/ui/page-heading";
import { confirmEmailChange } from "@/lib/members/pending-changes";

export default async function EmailBestaetigenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await confirmEmailChange(token)
    : { error: "Kein Bestätigungs-Token angegeben." };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Änderungsantrag"
        title="E-Mail-Adresse bestätigen"
      />
      {"error" in result ? (
        <p className="text-destructive text-sm">{result.error}</p>
      ) : (
        <p className="text-sm">
          Danke — die neue Adresse ist bestätigt. Sie wird wirksam, sobald der
          Vorstand die Änderung zusätzlich freigegeben hat.
        </p>
      )}
    </div>
  );
}
