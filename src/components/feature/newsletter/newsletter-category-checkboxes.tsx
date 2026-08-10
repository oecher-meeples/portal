"use client";

import { useState } from "react";
import type { NewsletterCategory } from "@prisma/client";
import { Label } from "@/components/ui/label";
import {
  NEWSLETTER_CATEGORIES,
  NEWSLETTER_CATEGORY_LABELS,
} from "@/lib/newsletter/labels";

/** Checkbox state for a set of newsletter categories, shared by every form that lets someone pick them. */
export function useNewsletterCategories(initial: NewsletterCategory[] = []) {
  const [categories, setCategories] = useState<NewsletterCategory[]>(initial);

  function toggleCategory(category: NewsletterCategory, checked: boolean) {
    setCategories((current) =>
      checked
        ? [...current, category]
        : current.filter((entry) => entry !== category),
    );
  }

  return { categories, setCategories, toggleCategory };
}

/** One checkbox per {@link NEWSLETTER_CATEGORIES} entry, optionally under a shared label. */
export function NewsletterCategoryCheckboxes({
  categories,
  toggleCategory,
  label,
}: {
  categories: NewsletterCategory[];
  toggleCategory: (category: NewsletterCategory, checked: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      {NEWSLETTER_CATEGORIES.map((category) => (
        <label key={category} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={categories.includes(category)}
            onChange={(event) => toggleCategory(category, event.target.checked)}
          />
          {NEWSLETTER_CATEGORY_LABELS[category]}
        </label>
      ))}
    </div>
  );
}
