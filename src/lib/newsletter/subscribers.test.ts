import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const sendTransactionalEmailMock = vi.fn();
vi.mock("@/lib/newsletter/mailer", () => ({
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...args),
}));

const {
  createPublicSubscription,
  confirmSubscription,
  updateSubscriptionCategories,
  unsubscribeAll,
  setMeepleNewsletterPreference,
} = await import("./subscribers");

beforeEach(() => {
  sendTransactionalEmailMock.mockReset();
  sendTransactionalEmailMock.mockResolvedValue(undefined);
});

describe("createPublicSubscription", () => {
  it("silently drops the request when the honeypot field is filled", async () => {
    const result = await createPublicSubscription({
      email: "bot@example.com",
      categories: ["NEWS"],
      honeypot: "I am a bot",
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.upsert).not.toHaveBeenCalled();
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it("rejects when no category is selected", async () => {
    const result = await createPublicSubscription({
      email: "person@example.com",
      categories: [],
    });

    expect(result).toEqual({
      error: "Bitte E-Mail-Adresse und mindestens eine Kategorie angeben.",
    });
  });

  it("creates a PENDING subscriber and sends a confirmation email", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue(null);
    prismaMock.newsletterSubscriber.upsert.mockResolvedValue({} as never);

    const result = await createPublicSubscription({
      email: "Person@Example.com",
      categories: ["NEWS", "TERMINE"],
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "person@example.com" },
        create: expect.objectContaining({ email: "person@example.com" }),
      }),
    );
    expect(sendTransactionalEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "person@example.com" }),
    );
  });

  it("does not resend the confirmation email within the cooldown window", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue({
      id: "sub-1",
      email: "person@example.com",
      manageToken: "token-1",
      status: "PENDING",
      confirmationSentAt: new Date(Date.now() - 60 * 1000),
    } as never);
    prismaMock.newsletterSubscriber.upsert.mockResolvedValue({} as never);

    await createPublicSubscription({
      email: "person@example.com",
      categories: ["NEWS"],
    });

    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it("resends the confirmation email once the cooldown has passed", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue({
      id: "sub-1",
      email: "person@example.com",
      manageToken: "token-1",
      status: "PENDING",
      confirmationSentAt: new Date(Date.now() - 16 * 60 * 1000),
    } as never);
    prismaMock.newsletterSubscriber.upsert.mockResolvedValue({} as never);

    await createPublicSubscription({
      email: "person@example.com",
      categories: ["NEWS"],
    });

    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
  });

  it("updates categories without re-sending a confirmation for an already confirmed subscriber", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue({
      id: "sub-1",
      email: "person@example.com",
      manageToken: "token-1",
      status: "CONFIRMED",
      confirmationSentAt: null,
    } as never);

    const result = await createPublicSubscription({
      email: "person@example.com",
      categories: ["BERICHTE"],
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { categories: ["BERICHTE"] },
    });
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });
});

describe("confirmSubscription", () => {
  it("returns an error for an unknown token", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue(null);

    const result = await confirmSubscription("bad-token");

    expect(result).toEqual({ error: "Dieser Bestätigungslink ist ungültig." });
    expect(prismaMock.newsletterSubscriber.update).not.toHaveBeenCalled();
  });

  it("marks a pending subscriber as confirmed", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue({
      id: "sub-1",
    } as never);

    const result = await confirmSubscription("token-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({ status: "CONFIRMED" }),
    });
  });
});

describe("updateSubscriptionCategories", () => {
  it("returns an error for an unknown token", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue(null);

    const result = await updateSubscriptionCategories("bad-token", ["NEWS"]);

    expect(result).toEqual({ error: "Dieser Verwaltungslink ist ungültig." });
  });

  it("updates the categories for a known token", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue({
      id: "sub-1",
    } as never);

    const result = await updateSubscriptionCategories("token-1", ["TURNIERE"]);

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { categories: ["TURNIERE"] },
    });
  });
});

describe("unsubscribeAll", () => {
  it("returns an error for an unknown token", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue(null);

    const result = await unsubscribeAll("bad-token");

    expect(result).toEqual({ error: "Dieser Verwaltungslink ist ungültig." });
    expect(prismaMock.newsletterSubscriber.delete).not.toHaveBeenCalled();
  });

  it("hard-deletes the subscriber row for a known token", async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue({
      id: "sub-1",
    } as never);

    const result = await unsubscribeAll("token-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.delete).toHaveBeenCalledWith({
      where: { id: "sub-1" },
    });
  });
});

describe("setMeepleNewsletterPreference", () => {
  it("deletes the subscriber row when disabling", async () => {
    const result = await setMeepleNewsletterPreference("meeple-1", {
      enabled: false,
      categories: [],
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.deleteMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1" },
    });
  });

  it("creates a CONFIRMED subscriber directly, without a confirmation email", async () => {
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      email: "meeple@example.com",
    } as never);
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue(null);
    prismaMock.newsletterSubscriber.upsert.mockResolvedValue({} as never);

    const result = await setMeepleNewsletterPreference("meeple-1", {
      enabled: true,
      categories: ["NEWS"],
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { meepleId: "meeple-1" },
        create: expect.objectContaining({ status: "CONFIRMED" }),
      }),
    );
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it("links an existing anonymous subscription under the same email instead of duplicating it", async () => {
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      email: "person@example.com",
    } as never);
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue({
      id: "sub-1",
      meepleId: null,
      confirmedAt: null,
    } as never);

    const result = await setMeepleNewsletterPreference("meeple-1", {
      enabled: true,
      categories: ["TERMINE"],
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        meepleId: "meeple-1",
        categories: ["TERMINE"],
        status: "CONFIRMED",
      }),
    });
    expect(prismaMock.newsletterSubscriber.upsert).not.toHaveBeenCalled();
  });

  it("does nothing when the meeple has no email on file", async () => {
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      email: null,
    } as never);

    const result = await setMeepleNewsletterPreference("meeple-1", {
      enabled: true,
      categories: ["NEWS"],
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.newsletterSubscriber.upsert).not.toHaveBeenCalled();
  });
});
