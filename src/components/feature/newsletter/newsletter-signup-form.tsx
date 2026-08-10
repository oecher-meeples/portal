"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/components/ui/use-action";
import {
  NewsletterCategoryCheckboxes,
  useNewsletterCategories,
} from "@/components/feature/newsletter/newsletter-category-checkboxes";
import { NewsletterHoneypotField } from "@/components/feature/newsletter/newsletter-honeypot-field";
import { subscribeToNewsletter } from "@/components/feature/newsletter/actions";

export function NewsletterSignupForm() {
  const [email, setEmail] = useState("");
  const { categories, toggleCategory } = useNewsletterCategories();
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { run, pending, error } = useAction({
    refresh: false,
    onSuccess: () => setSubmitted(true),
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await run(() => subscribeToNewsletter({ email, categories, honeypot }));
  }

  if (submitted) {
    return (
      <p className="text-sm">
        Fast geschafft — wir haben dir eine E-Mail mit einem Bestätigungslink
        geschickt.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newsletter-email">E-Mail-Adresse</Label>
        <Input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <NewsletterCategoryCheckboxes
        label="Worüber möchtest du informiert werden?"
        categories={categories}
        toggleCategory={toggleCategory}
      />

      <NewsletterHoneypotField value={honeypot} onChange={setHoneypot} />

      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        type="submit"
        disabled={pending || categories.length === 0}
        className="self-start"
      >
        {pending ? "Wird angemeldet…" : "Newsletter abonnieren"}
      </Button>
    </form>
  );
}
