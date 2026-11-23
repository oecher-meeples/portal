import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.fn();
const createTransportMock = vi.fn<(options: unknown) => unknown>(() => ({
  sendMail: sendMailMock,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: (options: unknown) => createTransportMock(options),
  },
}));

const MAIL = {
  to: "jane@example.com",
  subject: "Hallo",
  html: "<p>Hi</p>",
};

async function loadMailer() {
  // Fresh module per test: the transporter cache and the one-time
  // "SMTP off" warning are module-level state.
  vi.resetModules();
  return import("./mailer");
}

beforeEach(() => {
  sendMailMock.mockReset().mockResolvedValue({ messageId: "x" });
  createTransportMock.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendTransactionalEmail — SMTP not configured", () => {
  it("resolves without sending and warns only once", async () => {
    vi.stubEnv("SMTP_HOST", "");
    const { sendTransactionalEmail } = await loadMailer();

    await expect(sendTransactionalEmail(MAIL)).resolves.toBeUndefined();
    await expect(sendTransactionalEmail(MAIL)).resolves.toBeUndefined();

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("SMTP_HOST"),
    );
  });

  it("does not log the recipient address", async () => {
    vi.stubEnv("SMTP_HOST", "");
    const { sendTransactionalEmail } = await loadMailer();

    await sendTransactionalEmail(MAIL);

    const logged = [
      ...vi.mocked(console.warn).mock.calls,
      ...vi.mocked(console.info).mock.calls,
    ].flat();
    expect(logged.join(" ")).not.toContain(MAIL.to);
  });
});

describe("sendTransactionalEmail — SMTP configured", () => {
  beforeEach(() => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASS", "secret");
    vi.stubEnv("SMTP_FROM", '"Club" <club@example.com>');
  });

  it("sends the mail through the SMTP transport", async () => {
    const { sendTransactionalEmail } = await loadMailer();

    await sendTransactionalEmail(MAIL);

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: { user: "mailer", pass: "secret" },
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith({
      from: '"Club" <club@example.com>',
      ...MAIL,
    });
  });

  it("reuses the transporter across calls", async () => {
    const { sendTransactionalEmail } = await loadMailer();

    await sendTransactionalEmail(MAIL);
    await sendTransactionalEmail(MAIL);

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it("uses implicit TLS on port 465", async () => {
    vi.stubEnv("SMTP_PORT", "465");
    const { sendTransactionalEmail } = await loadMailer();

    await sendTransactionalEmail(MAIL);

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );
  });

  it("defaults port to 587, skips auth without SMTP_USER and uses the default sender", async () => {
    vi.stubEnv("SMTP_PORT", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_FROM", "");
    const { sendTransactionalEmail } = await loadMailer();

    await sendTransactionalEmail(MAIL);

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, auth: undefined }),
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Oecher Meeples" <newsletter@oecher-meeples.org>',
      }),
    );
  });

  it("rejects an invalid SMTP_PORT", async () => {
    vi.stubEnv("SMTP_PORT", "abc");
    const { sendTransactionalEmail } = await loadMailer();

    await expect(sendTransactionalEmail(MAIL)).rejects.toThrow(
      "Ungültiger SMTP_PORT: abc",
    );
  });

  it("wraps transport failures in a MailerError", async () => {
    sendMailMock.mockRejectedValue(new Error("Connection refused"));
    const { sendTransactionalEmail, MailerError } = await loadMailer();

    const result = sendTransactionalEmail(MAIL);

    await expect(result).rejects.toBeInstanceOf(MailerError);
    await expect(result).rejects.toThrow(
      "SMTP-Versand fehlgeschlagen: Connection refused",
    );
  });

  it("stringifies non-Error rejections", async () => {
    sendMailMock.mockRejectedValue("kaputt");
    const { sendTransactionalEmail } = await loadMailer();

    await expect(sendTransactionalEmail(MAIL)).rejects.toThrow(
      "SMTP-Versand fehlgeschlagen: kaputt",
    );
  });
});
