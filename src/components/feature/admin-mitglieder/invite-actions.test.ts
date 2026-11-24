import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();

const getDefaultInviteDaysMock = vi.fn();
vi.mock("@/lib/members/invite-settings", () => ({
  getDefaultInviteDays: () => getDefaultInviteDaysMock(),
}));

const sendInviteMailMock = vi.fn<(invite: unknown) => Promise<string | null>>();
vi.mock("@/lib/members/invite-mail", () => ({
  sendInviteMail: (invite: unknown) => sendInviteMailMock(invite),
}));

const findOpenInviteByEmailMock = vi.fn();
vi.mock("@/lib/members/invites", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/invites")>(
    "@/lib/members/invites",
  );
  return {
    ...actual,
    findOpenInviteByEmail: (...args: unknown[]) =>
      findOpenInviteByEmailMock(...args),
  };
});
const listMissingInviteCandidatesMock = vi.fn();
vi.mock("@/lib/members/members-without-login", () => ({
  listMissingInviteCandidates: () => listMissingInviteCandidatesMock(),
}));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom((...args) =>
    requirePermissionMock(...args),
  ),
);

const {
  createInvite,
  bulkImportInvites,
  extendInvite,
  resendInviteMail,
  countMissingInvites,
  inviteAllMissing,
} = await import("./invite-actions");

const MEMBER = {
  id: "member-1",
  email: "erika@example.com",
  meepleId: null,
};

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-1" });
  getDefaultInviteDaysMock.mockResolvedValue(14);
  findOpenInviteByEmailMock.mockResolvedValue(null);
  prismaMock.member.findUniqueOrThrow.mockResolvedValue(MEMBER as never);
  prismaMock.invite.create.mockResolvedValue({
    token: "abc123",
    email: MEMBER.email,
    expiresAt: new Date("2026-08-15T00:00:00Z"),
  } as never);
  sendInviteMailMock.mockReset().mockResolvedValue(null);
});

const OPEN_INVITE = {
  id: "invite-1",
  token: "abc123",
  email: MEMBER.email,
  expiresIn: 60,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  redeemedAt: null,
  revokedAt: null,
};

describe("invite mail (#613)", () => {
  it("mails the new invite to the member's address", async () => {
    const result = await createInvite({ memberId: "member-1" });

    expect(sendInviteMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: "abc123", email: MEMBER.email }),
    );
    expect(result.mailError).toBeNull();
  });

  it("keeps the invite and reports the mail error instead of throwing", async () => {
    sendInviteMailMock.mockResolvedValue("SMTP_HOST fehlt");

    const result = await createInvite({ memberId: "member-1" });

    expect(prismaMock.invite.create).toHaveBeenCalled();
    expect(result).toMatchObject({
      token: "abc123",
      mailError: "SMTP_HOST fehlt",
    });
  });

  it("reports a failed mail in the CSV import as a row error, still counting the invite", async () => {
    prismaMock.member.findFirst.mockResolvedValue(MEMBER as never);
    sendInviteMailMock.mockResolvedValue("kaputt");

    const result = await bulkImportInvites([MEMBER.email]);

    expect(result).toEqual({
      created: 1,
      errors: [
        {
          email: MEMBER.email,
          message: "Einladung angelegt, Mail fehlgeschlagen: kaputt",
        },
      ],
    });
  });

  it("mails the link again when an invite is extended", async () => {
    prismaMock.invite.findUniqueOrThrow.mockResolvedValue(OPEN_INVITE as never);
    prismaMock.invite.update.mockResolvedValue(OPEN_INVITE as never);

    await expect(extendInvite("invite-1")).resolves.toEqual({ success: true });
    expect(sendInviteMailMock).toHaveBeenCalledWith(OPEN_INVITE);
  });

  it("resends the mail for an open invite", async () => {
    prismaMock.invite.findUniqueOrThrow.mockResolvedValue(OPEN_INVITE as never);

    await expect(resendInviteMail("invite-1")).resolves.toEqual({
      success: true,
    });
    expect(sendInviteMailMock).toHaveBeenCalledWith(OPEN_INVITE);
  });

  it("refuses to resend a revoked invite", async () => {
    prismaMock.invite.findUniqueOrThrow.mockResolvedValue({
      ...OPEN_INVITE,
      revokedAt: new Date(),
    } as never);

    await expect(resendInviteMail("invite-1")).resolves.toEqual({
      error: "Diese Einladung ist nicht mehr offen.",
    });
    expect(sendInviteMailMock).not.toHaveBeenCalled();
  });

  it("returns the mail error from a resend", async () => {
    prismaMock.invite.findUniqueOrThrow.mockResolvedValue(OPEN_INVITE as never);
    sendInviteMailMock.mockResolvedValue("kaputt");

    await expect(resendInviteMail("invite-1")).resolves.toEqual({
      error: "kaputt",
    });
  });
});

describe("createInvite (#349)", () => {
  it("always uses the central default validity, never a caller-supplied override", async () => {
    await createInvite({ memberId: "member-1" });

    expect(getDefaultInviteDaysMock).toHaveBeenCalled();
    expect(prismaMock.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expiresIn: 14 * 24 * 60 }),
      }),
    );
  });

  it("refuses a member who already has a portal login", async () => {
    prismaMock.member.findUniqueOrThrow.mockResolvedValue({
      ...MEMBER,
      meepleId: "meeple-1",
    } as never);

    await expect(createInvite({ memberId: "member-1" })).rejects.toThrow(
      "Dieses Mitglied hat bereits ein Portal-Login.",
    );
  });

  it("refuses a member without an email address (#374)", async () => {
    prismaMock.member.findUniqueOrThrow.mockResolvedValue({
      ...MEMBER,
      email: null,
    } as never);

    await expect(createInvite({ memberId: "member-1" })).rejects.toThrow(
      "Dieses Mitglied hat keine E-Mail-Adresse hinterlegt.",
    );
  });
});

describe("bulkImportInvites (#265)", () => {
  it("creates one invite per email with a matching, loginless member", async () => {
    prismaMock.member.findFirst.mockResolvedValue(MEMBER as never);

    const result = await bulkImportInvites(["erika@example.com"]);

    expect(result).toEqual({ created: 1, errors: [] });
    expect(prismaMock.invite.create).toHaveBeenCalledTimes(1);
  });

  it("reports a per-row error for an email with no matching member, without aborting the batch", async () => {
    prismaMock.member.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(MEMBER as never);

    const result = await bulkImportInvites([
      "unknown@example.com",
      "erika@example.com",
    ]);

    expect(result.created).toBe(1);
    expect(result.errors).toEqual([
      {
        email: "unknown@example.com",
        message: "Kein einladbares Mitglied mit dieser E-Mail-Adresse.",
      },
    ]);
  });

  it("only matches members without a portal login and without resignation", async () => {
    await bulkImportInvites(["erika@example.com"]);

    expect(prismaMock.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: "erika@example.com",
          meepleId: null,
          resignedAt: null,
        },
      }),
    );
  });
});

describe("inviteAllMissing (#622)", () => {
  class ForbiddenError extends Error {}

  beforeEach(() => {
    listMissingInviteCandidatesMock.mockReset().mockResolvedValue([MEMBER]);
  });

  it("requires invites:manage for count and send", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(countMissingInvites()).rejects.toThrow(ForbiddenError);
    await expect(inviteAllMissing()).rejects.toThrow(ForbiddenError);
    expect(requirePermissionMock).toHaveBeenCalledWith("invites:manage");
    expect(prismaMock.invite.create).not.toHaveBeenCalled();
  });

  it("counts the server-side candidates", async () => {
    listMissingInviteCandidatesMock.mockResolvedValue([MEMBER, MEMBER]);

    expect(await countMissingInvites()).toEqual({ count: 2 });
  });

  it("creates and mails one invite per candidate", async () => {
    const result = await inviteAllMissing();

    expect(result).toEqual({ created: 1, errors: [] });
    expect(prismaMock.invite.create).toHaveBeenCalledTimes(1);
    expect(sendInviteMailMock).toHaveBeenCalledTimes(1);
  });

  it("reports a failed mail per address", async () => {
    sendInviteMailMock.mockResolvedValue("SMTP_HOST fehlt");

    expect(await inviteAllMissing()).toEqual({
      created: 1,
      errors: [
        {
          email: MEMBER.email,
          message: "Einladung angelegt, Mail fehlgeschlagen: SMTP_HOST fehlt",
        },
      ],
    });
  });

  it("sends nothing on a second click once nobody is missing anymore", async () => {
    await inviteAllMissing();
    listMissingInviteCandidatesMock.mockResolvedValue([]);
    prismaMock.invite.create.mockClear();

    expect(await inviteAllMissing()).toEqual({ created: 0, errors: [] });
    expect(prismaMock.invite.create).not.toHaveBeenCalled();
  });
});
