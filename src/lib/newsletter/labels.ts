import type { NewsletterCategory } from "@prisma/client";

export const NEWSLETTER_CATEGORY_LABELS: Record<NewsletterCategory, string> = {
  TERMINE: "Termine",
  NEWS: "News",
  TURNIERE: "Turniere",
  BERICHTE: "Berichte zu vergangenen Events",
};

export const NEWSLETTER_CATEGORIES = Object.keys(
  NEWSLETTER_CATEGORY_LABELS,
) as NewsletterCategory[];
