"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action";
import { subscribeToNewsletter } from "@/components/feature/newsletter/actions";

/** Compact single-field variant of {@link NewsletterSignupForm}, for embedding inline in other pages. */
export function NewsletterInlineSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { run, pending, error } = useAction({
    refresh: false,
    onSuccess: () => setSubmitted(true),
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await run(() => subscribeToNewsletter({ email, categories: ["NEWS"] }));
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-3 text-sm"
    >
      <p className="text-muted-foreground">
        Unsere Blog-Beiträge sind auch als Newsletter verfügbar.
      </p>
      <div className="flex-1" />
      <Input
        type="email"
        placeholder="E-Mail-Adresse"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        className="w-auto"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Wird angemeldet…" : "Abonnieren"}
      </Button>
      {error && <p className="text-destructive w-full text-sm">{error}</p>}
    </form>
  );
}
