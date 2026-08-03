import { PageHeading } from "@/components/ui/page-heading";
import { NewsletterSignupForm } from "@/components/feature/newsletter/newsletter-signup-form";

export default function NewsletterPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Auf dem Laufenden bleiben"
        title="Newsletter"
        description="Wähle, worüber wir dich per E-Mail informieren sollen."
      />
      <NewsletterSignupForm />
    </div>
  );
}
