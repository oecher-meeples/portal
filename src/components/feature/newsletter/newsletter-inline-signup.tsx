"use client";

import { useState } from "react";
import type { NewsletterCategory } from "@prisma/client";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import {
  NewsletterCategoryCheckboxes,
  useNewsletterCategories,
} from "@/components/feature/newsletter/newsletter-category-checkboxes";
import { NewsletterEmailField } from "@/components/feature/newsletter/newsletter-email-field";
import { NewsletterHoneypotField } from "@/components/feature/newsletter/newsletter-honeypot-field";
import { subscribeToNewsletter } from "@/components/feature/newsletter/actions";
import { isValidEmail } from "@/lib/utils/validate-email";

const DEFAULT_CATEGORIES: NewsletterCategory[] = ["NEWS"];

/** Compact variant of {@link NewsletterSignupForm}: a button that opens a dialog with the same fields, for embedding inline in other pages. */
export function NewsletterInlineSignup() {
  const [email, setEmail] = useState("");
  const { categories, setCategories, toggleCategory } = useNewsletterCategories(
    [...DEFAULT_CATEGORIES],
  );
  const [honeypot, setHoneypot] = useState("");

  function reset() {
    setEmail("");
    setCategories([...DEFAULT_CATEGORIES]);
    setHoneypot("");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <p className="text-muted-foreground mr-20">
        Unsere Blog-Beiträge sind auch als Newsletter verfügbar.
      </p>

      <ActionDialog
        trigger={<Button className="w-auto shrink-0">Abonnieren</Button>}
        title="Newsletter abonnieren"
        description="Wähle, worüber wir dich per E-Mail informieren sollen."
        submitLabel="Abonnieren"
        pendingLabel="Wird angemeldet…"
        canSubmit={isValidEmail(email) && categories.length > 0}
        onReset={reset}
        action={() => subscribeToNewsletter({ email, categories, honeypot })}
      >
        <div className="flex flex-col gap-4">
          <NewsletterEmailField value={email} onChange={setEmail} />

          <NewsletterCategoryCheckboxes
            label="Worüber möchtest du informiert werden?"
            categories={categories}
            toggleCategory={toggleCategory}
          />

          <NewsletterHoneypotField value={honeypot} onChange={setHoneypot} />
        </div>
      </ActionDialog>
    </div>
  );
}
