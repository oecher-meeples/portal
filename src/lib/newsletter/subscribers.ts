import { NewsletterCategory, NewsletterSubscriberStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { isValidEmail } from "@/lib/utils/validate-email";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";
import { generateToken as generateManageToken } from "@/lib/utils/generate-token";

const CONFIRMATION_COOLDOWN_MS = 15 * 60 * 1000;

function siteUrl(): string {
  return process.env.PUBLIC_SITE_URL ?? "";
}

function confirmationEmailHtml(manageToken: string): string {
  const confirmUrl = `${siteUrl()}/newsletter/confirm?token=${manageToken}`;
  return `<p>Bitte bestätige deine Newsletter-Anmeldung:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`;
}

export type PublicSubscriptionInput = {
  email: string;
  categories: NewsletterCategory[];
  /** Hidden form field — filled in only by bots. Silently dropped, no error. */
  honeypot?: string;
};

/** Anonymous public sign-up. Needs double opt-in — see `confirmSubscription`. */
export async function createPublicSubscription(
  input: PublicSubscriptionInput,
): Promise<{ success: true } | { error: string }> {
  if (input.honeypot) {
    return { success: true };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || input.categories.length === 0) {
    return {
      error: "Bitte E-Mail-Adresse und mindestens eine Kategorie angeben.",
    };
  }
  if (!isValidEmail(email)) {
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });

  const withinCooldown =
    existing?.confirmationSentAt &&
    Date.now() - existing.confirmationSentAt.getTime() <
      CONFIRMATION_COOLDOWN_MS;

  if (existing?.status === NewsletterSubscriberStatus.CONFIRMED) {
    await prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      data: { categories: input.categories },
    });
    return { success: true };
  }

  const manageToken = existing?.manageToken ?? generateManageToken();
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: {
      email,
      categories: input.categories,
      manageToken,
      confirmationSentAt: withinCooldown ? undefined : new Date(),
    },
    update: {
      categories: input.categories,
      ...(withinCooldown ? {} : { confirmationSentAt: new Date() }),
    },
  });

  if (!withinCooldown) {
    await sendTransactionalEmail({
      to: email,
      subject: "Bitte bestätige deine Newsletter-Anmeldung",
      html: confirmationEmailHtml(manageToken),
    });
  }

  return { success: true };
}

export async function findSubscriptionByToken(token: string) {
  return prisma.newsletterSubscriber.findUnique({
    where: { manageToken: token },
    select: { email: true, categories: true },
  });
}

export async function findMeepleNewsletterPreference(
  meepleId: string,
): Promise<{ enabled: boolean; categories: NewsletterCategory[] }> {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { meepleId },
    select: { categories: true },
  });
  return {
    enabled: subscriber !== null,
    categories: subscriber?.categories ?? [],
  };
}

export async function confirmSubscription(
  token: string,
): Promise<{ success: true } | { error: string }> {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { manageToken: token },
  });
  if (!subscriber) {
    return { error: "Dieser Bestätigungslink ist ungültig." };
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      status: NewsletterSubscriberStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });
  return { success: true };
}

export async function updateSubscriptionCategories(
  token: string,
  categories: NewsletterCategory[],
): Promise<{ success: true } | { error: string }> {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { manageToken: token },
  });
  if (!subscriber) {
    return { error: "Dieser Verwaltungslink ist ungültig." };
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { categories },
  });
  return { success: true };
}

/** Hard delete — DSGVO: no legal basis to retain the row after withdrawal. */
export async function unsubscribeAll(
  token: string,
): Promise<{ success: true } | { error: string }> {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { manageToken: token },
  });
  if (!subscriber) {
    return { error: "Dieser Verwaltungslink ist ungültig." };
  }

  await prisma.newsletterSubscriber.delete({ where: { id: subscriber.id } });
  return { success: true };
}

/** Profile toggle — already authenticated, so no double opt-in needed. */
export async function setMeepleNewsletterPreference(
  meepleId: string,
  {
    enabled,
    categories,
  }: { enabled: boolean; categories: NewsletterCategory[] },
): Promise<{ success: true }> {
  if (!enabled) {
    await prisma.newsletterSubscriber.deleteMany({ where: { meepleId } });
    return { success: true };
  }

  const meeple = await prisma.meeple.findUniqueOrThrow({
    where: { id: meepleId },
    select: { email: true },
  });
  const email = meeple.email?.trim().toLowerCase();
  if (!email) {
    return { success: true };
  }

  // A prior anonymous sign-up under the same address is linked rather than
  // duplicated — `email` is unique, so a plain upsert-by-meepleId would
  // otherwise collide with that row.
  const existingByEmail = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });
  if (existingByEmail && existingByEmail.meepleId !== meepleId) {
    await prisma.newsletterSubscriber.update({
      where: { id: existingByEmail.id },
      data: {
        meepleId,
        categories,
        status: NewsletterSubscriberStatus.CONFIRMED,
        confirmedAt: existingByEmail.confirmedAt ?? new Date(),
      },
    });
    return { success: true };
  }

  await prisma.newsletterSubscriber.upsert({
    where: { meepleId },
    create: {
      email,
      meepleId,
      categories,
      status: NewsletterSubscriberStatus.CONFIRMED,
      manageToken: generateManageToken(),
      confirmedAt: new Date(),
    },
    update: { categories },
  });
  return { success: true };
}
