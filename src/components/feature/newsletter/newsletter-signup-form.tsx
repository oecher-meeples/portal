"use client";

import { useState } from "react";
import type { NewsletterCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/components/ui/use-action";
import {
  NEWSLETTER_CATEGORIES,
  NEWSLETTER_CATEGORY_LABELS,
} from "@/lib/newsletter/labels";
import { subscribeToNewsletter } from "@/components/feature/newsletter/actions";

export function NewsletterSignupForm() {
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState<NewsletterCategory[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { run, pending, error } = useAction({
    refresh: false,
    onSuccess: () => setSubmitted(true),
  });

  function toggleCategory(category: NewsletterCategory, checked: boolean) {
    setCategories((current) =>
      checked
        ? [...current, category]
        : current.filter((entry) => entry !== category),
    );
  }

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

      <div className="flex flex-col gap-1.5">
        <Label>Worüber möchtest du informiert werden?</Label>
        {NEWSLETTER_CATEGORIES.map((category) => (
          <label key={category} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={categories.includes(category)}
              onChange={(event) =>
                toggleCategory(category, event.target.checked)
              }
            />
            {NEWSLETTER_CATEGORY_LABELS[category]}
          </label>
        ))}
      </div>

      {/* Honeypot: off-screen, not display:none, so naive bots that skip hidden
          fields still fill it in. */}
      <div
        aria-hidden="true"
        className="absolute top-auto -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="newsletter-website">Website</label>
        <input
          id="newsletter-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

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
