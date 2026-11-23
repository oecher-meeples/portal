"use client";

import { useState } from "react";
import type { NewsletterCategory } from "@prisma/client";
import { useAction } from "@/components/ui/use-action";
import {
  NEWSLETTER_CATEGORIES,
  NEWSLETTER_CATEGORY_LABELS,
} from "@/lib/newsletter/labels";
import { updateNewsletterPreference } from "@/lib/members/own-profile-actions";

export function NewsletterPreferencePanel({
  initialEnabled,
  initialCategories,
}: {
  initialEnabled: boolean;
  initialCategories: NewsletterCategory[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
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

  async function save(
    nextEnabled: boolean,
    nextCategories: NewsletterCategory[],
  ) {
    await run(() =>
      updateNewsletterPreference({
        enabled: nextEnabled,
        categories: nextCategories,
      }),
    );
  }

  async function handleToggle(checked: boolean) {
    setEnabled(checked);
    await save(checked, categories);
  }

  async function handleCategoryToggle(
    category: NewsletterCategory,
    checked: boolean,
  ) {
    const next = checked
      ? [...categories, category]
      : categories.filter((entry) => entry !== category);
    toggleCategory(category, checked);
    await save(enabled, next);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(event) => handleToggle(event.target.checked)}
        />
        Newsletter aktivieren
      </label>

      {enabled && (
        <div className="flex flex-col gap-1.5 pl-6">
          {NEWSLETTER_CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={categories.includes(category)}
                disabled={pending}
                onChange={(event) =>
                  handleCategoryToggle(category, event.target.checked)
                }
              />
              {NEWSLETTER_CATEGORY_LABELS[category]}
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
