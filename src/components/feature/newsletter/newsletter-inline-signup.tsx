"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  NewsletterCategoryCheckboxes,
  useNewsletterCategories,
} from "@/components/feature/newsletter/newsletter-category-checkboxes";
import { NewsletterHoneypotField } from "@/components/feature/newsletter/newsletter-honeypot-field";
import { subscribeToNewsletter } from "@/components/feature/newsletter/actions";

/** Compact variant of {@link NewsletterSignupForm}: a button that opens a dialog with the same fields, for embedding inline in other pages. */
export function NewsletterInlineSignup() {
  const [email, setEmail] = useState("");
  const { categories, setCategories, toggleCategory } =
    useNewsletterCategories();
  const [honeypot, setHoneypot] = useState("");

  function reset() {
    setEmail("");
    setCategories([]);
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
        canSubmit={email !== "" && categories.length > 0}
        onReset={reset}
        action={() => subscribeToNewsletter({ email, categories, honeypot })}
      >
        <div className="flex flex-col gap-4">
          <TextField
            id="newsletter-email"
            label="E-Mail-Adresse"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

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
