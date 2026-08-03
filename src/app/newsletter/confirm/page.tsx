import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { confirmSubscription } from "@/lib/newsletter/subscribers";

export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await confirmSubscription(token)
    : { error: "Kein Bestätigungslink angegeben." };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading eyebrow="Newsletter" title="Anmeldung bestätigen" />
      {"error" in result ? (
        <p className="text-destructive text-sm">{result.error}</p>
      ) : (
        <p className="text-sm">
          Deine Newsletter-Anmeldung ist bestätigt. Du kannst deine
          Einstellungen jederzeit über den Link in jeder E-Mail anpassen oder{" "}
          <Link href="/newsletter/manage" className="underline">
            hier verwalten
          </Link>
          .
        </p>
      )}
    </div>
  );
}
