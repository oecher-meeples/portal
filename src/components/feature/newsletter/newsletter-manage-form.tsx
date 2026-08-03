"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NewsletterCategory } from "@prisma/client";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";
import {
  NEWSLETTER_CATEGORIES,
  NEWSLETTER_CATEGORY_LABELS,
} from "@/lib/newsletter/labels";
import {
  unsubscribeFromNewsletter,
  updateNewsletterCategories,
} from "@/components/feature/newsletter/actions";

export function NewsletterManageForm({
  token,
  email,
  initialCategories,
}: {
  token: string;
  email: string;
  initialCategories: NewsletterCategory[];
}) {
  const router = useRouter();
  const [categories, setCategories] =
    useState<NewsletterCategory[]>(initialCategories);
  const { run, pending, error } = useAction({ refresh: false });

  function toggleCategory(category: NewsletterCategory, checked: boolean) {
    setCategories((current) =>
      checked
        ? [...current, category]
        : current.filter((entry) => entry !== category),
    );
  }

  async function handleSave() {
    await run(() => updateNewsletterCategories(token, categories));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{email}</p>

      <div className="flex flex-col gap-1.5">
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

      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="self-start"
        >
          {pending ? "Speichere…" : "Änderungen speichern"}
        </Button>
        <ActionButton
          variant="destructive"
          confirm="Newsletter wirklich komplett abbestellen?"
          action={() => unsubscribeFromNewsletter(token)}
          refresh={false}
          onSuccess={() => router.push("/")}
        >
          Newsletter komplett abbestellen
        </ActionButton>
      </div>
    </div>
  );
}
