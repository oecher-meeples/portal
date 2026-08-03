import { PageHeading } from "@/components/ui/page-heading";
import { findSubscriptionByToken } from "@/lib/newsletter/subscribers";
import { NewsletterManageForm } from "@/components/feature/newsletter/newsletter-manage-form";

export default async function ManageNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const subscription = token ? await findSubscriptionByToken(token) : null;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading eyebrow="Newsletter" title="Einstellungen verwalten" />
      {!token || !subscription ? (
        <p className="text-destructive text-sm">
          Dieser Verwaltungslink ist ungültig.
        </p>
      ) : (
        <NewsletterManageForm
          token={token}
          email={subscription.email}
          initialCategories={subscription.categories}
        />
      )}
    </div>
  );
}
