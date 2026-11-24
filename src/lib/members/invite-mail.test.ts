import { beforeEach, describe, expect, it, vi } from "vitest";

const sendTransactionalEmailMock =
  vi.fn<
    (mail: { to: string; subject: string; html: string }) => Promise<void>
  >();
vi.mock("@/lib/newsletter/mailer", () => ({
  sendTransactionalEmail: (mail: {
    to: string;
    subject: string;
    html: string;
  }) => sendTransactionalEmailMock(mail),
}));

const { sendInviteMail } = await import("./invite-mail");

const INVITE = {
  email: "erika+test@example.com",
  token: "tok123",
  expiresAt: new Date("2026-12-01T10:00:00Z"),
};

beforeEach(() => {
  vi.stubEnv("PUBLIC_SITE_URL", "https://portal.example.org");
  sendTransactionalEmailMock.mockReset().mockResolvedValue();
});

describe("sendInviteMail (#613)", () => {
  it("mails a clickable registration link to the invite's address", async () => {
    await expect(sendInviteMail(INVITE)).resolves.toBeNull();

    const mail = sendTransactionalEmailMock.mock.calls[0][0];
    expect(mail.to).toBe(INVITE.email);
    expect(mail.subject).toBe("Einladung zu Oecher Meeples");
    const escapedLink =
      "https://portal.example.org/registrieren?token=tok123&amp;email=erika%2Btest%40example.com";
    expect(mail.html).toContain(`<a href="${escapedLink}">${escapedLink}</a>`);
    expect(mail.html).toContain("gültig bis");
  });

  it("returns the error message instead of throwing", async () => {
    sendTransactionalEmailMock.mockRejectedValue(new Error("SMTP_HOST fehlt"));

    await expect(sendInviteMail(INVITE)).resolves.toBe("SMTP_HOST fehlt");
  });

  it("falls back to a generic message for non-Error rejections", async () => {
    sendTransactionalEmailMock.mockRejectedValue("kaputt");

    await expect(sendInviteMail(INVITE)).resolves.toBe(
      "Der Versand ist fehlgeschlagen.",
    );
  });
});
