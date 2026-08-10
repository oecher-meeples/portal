"use client";

import { useRouter } from "next/navigation";
import type { NewsletterCategory } from "@prisma/client";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";
import {
  NewsletterCategoryCheckboxes,
  useNewsletterCategories,
} from "@/components/feature/newsletter/newsletter-category-checkboxes";
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
  const { categories, toggleCategory } =
    useNewsletterCategories(initialCategories);
  const { run, pending, error } = useAction({ refresh: false });

  async function handleSave() {
    await run(() => updateNewsletterCategories(token, categories));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{email}</p>

      <NewsletterCategoryCheckboxes
        categories={categories}
        toggleCategory={toggleCategory}
      />

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
