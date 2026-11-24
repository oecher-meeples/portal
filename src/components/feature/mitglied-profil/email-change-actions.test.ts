import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { MailerError } from "@/lib/newsletter/mailer";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const requireMemberMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireMember: () => requireMemberMock(),
}));

const requestEmailChangeMock = vi.fn();
vi.mock("@/lib/members/pending-changes", () => ({
  requestEmailChange: (memberId: string, email: string) =>
    requestEmailChangeMock(memberId, email),
}));

const revalidateMemberProfileMock = vi.fn();
vi.mock("@/lib/members/revalidate-profile", () => ({
  revalidateMemberProfile: (arg: unknown) => revalidateMemberProfileMock(arg),
}));

const { requestOwnEmailChange } = await import("./email-change-actions");

beforeEach(() => {
  requireMemberMock
    .mockReset()
    .mockResolvedValue({ meeple: { id: "meeple-1" } });
  requestEmailChangeMock.mockReset().mockResolvedValue({ success: true });
  revalidateMemberProfileMock.mockReset();
  prismaMock.member.findUnique.mockResolvedValue({ id: "member-1" } as never);
});

describe("requestOwnEmailChange (#614)", () => {
  it("files the request for the session's own member", async () => {
    await expect(requestOwnEmailChange("neu@example.com")).resolves.toEqual({
      success: true,
    });
    expect(prismaMock.member.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { meepleId: "meeple-1" } }),
    );
    expect(requestEmailChangeMock).toHaveBeenCalledWith(
      "member-1",
      "neu@example.com",
    );
    expect(revalidateMemberProfileMock).toHaveBeenCalledWith({
      memberId: "member-1",
    });
  });

  it("refuses an account without a club membership", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    await expect(requestOwnEmailChange("neu@example.com")).resolves.toEqual({
      error: "Für dein Konto liegt keine Vereinsmitgliedschaft vor.",
    });
    expect(requestEmailChangeMock).not.toHaveBeenCalled();
  });

  it("passes a validation error through", async () => {
    requestEmailChangeMock.mockResolvedValue({
      error: "Ungültige E-Mail-Adresse.",
    });

    await expect(requestOwnEmailChange("x")).resolves.toEqual({
      error: "Ungültige E-Mail-Adresse.",
    });
    expect(revalidateMemberProfileMock).not.toHaveBeenCalled();
  });

  it("turns a thrown mail error into an error result", async () => {
    requestEmailChangeMock.mockRejectedValue(
      new MailerError("SMTP_HOST fehlt"),
    );

    await expect(requestOwnEmailChange("neu@example.com")).resolves.toEqual({
      error: "SMTP_HOST fehlt",
    });
  });
});
