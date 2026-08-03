"use server";

import type { NewsletterCategory } from "@prisma/client";
import {
  confirmSubscription,
  createPublicSubscription,
  unsubscribeAll,
  updateSubscriptionCategories,
} from "@/lib/newsletter/subscribers";

export async function subscribeToNewsletter(input: {
  email: string;
  categories: NewsletterCategory[];
  honeypot?: string;
}) {
  return createPublicSubscription(input);
}

export async function confirmNewsletterSubscription(token: string) {
  return confirmSubscription(token);
}

export async function updateNewsletterCategories(
  token: string,
  categories: NewsletterCategory[],
) {
  return updateSubscriptionCategories(token, categories);
}

export async function unsubscribeFromNewsletter(token: string) {
  return unsubscribeAll(token);
}
