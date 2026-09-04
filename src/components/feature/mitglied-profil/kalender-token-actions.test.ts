import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const generateMemberCalendarTokenMock = vi.fn();
const revokeMemberCalendarTokenMock = vi.fn();
vi.mock("@/lib/members/calendar-token", () => ({
  generateMemberCalendarToken: (...args: unknown[]) =>
    generateMemberCalendarTokenMock(...args),
  revokeMemberCalendarToken: (...args: unknown[]) =>
    revokeMemberCalendarTokenMock(...args),
}));

const sendTransactionalEmailMock = vi.fn();
vi.mock("@/lib/newsletter/mailer", () => ({
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...args),
}));

const {
  generateMemberCalendarSubscription,
  revokeMemberCalendarSubscription,
  sendMemberCalendarSubscriptionMail,
} = await import("./kalender-token-actions");

beforeEach(() => {
  requirePermissionMock.mockReset();
  requirePermissionMock.mockResolvedValue({ id: "admin-1" });
  generateMemberCalendarTokenMock.mockReset();
  generateMemberCalendarTokenMock.mockResolvedValue("raw-token");
  revokeMemberCalendarTokenMock.mockReset();
  sendTransactionalEmailMock.mockReset();
  sendTransactionalEmailMock.mockResolvedValue(undefined);
  prismaMock.member.findUniqueOrThrow.mockResolvedValue({
    slug: "mitglied-1",
  } as never);
});

describe("generateMemberCalendarSubscription (#438)", () => {
  it("requires admin:access", async () => {
    await generateMemberCalendarSubscription("member-1");

    expect(requirePermissionMock).toHaveBeenCalledWith("admin:access");
  });

  it("returns a subscribe URL built from the raw token, ending in .ics", async () => {
    process.env.PUBLIC_SITE_URL = "https://example.org";

    const result = await generateMemberCalendarSubscription("member-1");

    expect(result.subscribeUrl).toBe(
      "https://example.org/api/calendar/internal/raw-token.ics",
    );
  });
});

describe("revokeMemberCalendarSubscription (#438)", () => {
  it("requires admin:access and revokes the token", async () => {
    await revokeMemberCalendarSubscription("member-1");

    expect(requirePermissionMock).toHaveBeenCalledWith("admin:access");
    expect(revokeMemberCalendarTokenMock).toHaveBeenCalledWith("member-1");
  });
});

describe("sendMemberCalendarSubscriptionMail (#438)", () => {
  it("requires admin:access", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      email: "member@example.org",
      meeple: { displayName: "Lea Beispiel" },
    } as never);

    await sendMemberCalendarSubscriptionMail("member-1");

    expect(requirePermissionMock).toHaveBeenCalledWith("admin:access");
  });

  it("errors without crashing when the member has no stored email", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      email: null,
      meeple: { displayName: "Lea Beispiel" },
    } as never);

    const result = await sendMemberCalendarSubscriptionMail("member-1");

    expect(result).toEqual({
      error: "Für dieses Mitglied ist keine E-Mail-Adresse hinterlegt.",
    });
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it("rotates the token and emails the fresh subscribe URL", async () => {
    process.env.PUBLIC_SITE_URL = "https://example.org";
    prismaMock.member.findUnique.mockResolvedValue({
      email: "member@example.org",
      meeple: { displayName: "Lea Beispiel" },
    } as never);

    const result = await sendMemberCalendarSubscriptionMail("member-1");

    expect(generateMemberCalendarTokenMock).toHaveBeenCalledWith("member-1");
    expect(sendTransactionalEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "member@example.org",
        html: expect.stringContaining(
          "https://example.org/api/calendar/internal/raw-token.ics",
        ),
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it("surfaces a mail-send failure as an error instead of throwing", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      email: "member@example.org",
      meeple: { displayName: "Lea Beispiel" },
    } as never);
    sendTransactionalEmailMock.mockRejectedValue(new Error("Brevo down"));

    const result = await sendMemberCalendarSubscriptionMail("member-1");

    expect(result).toEqual({ error: "Brevo down" });
  });
});
