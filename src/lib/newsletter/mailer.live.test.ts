import { describe, expect, it } from "vitest";
import { sendTransactionalEmail } from "./mailer";

/**
 * Sends one real mail through the SMTP server configured in .env.local
 * (SMTP_HOST/PORT/USER/PASS/FROM) — your provider, a self-hosted
 * docker-mailserver, or a local catcher like Mailpit
 * (`docker run -p 1025:1025 -p 8025:8025 axllent/mailpit`, SMTP_PORT=1025).
 * Not part of the deterministic suite (mailer.test.ts mocks nodemailer); it's
 * the only test that catches wrong credentials/TLS settings against a real
 * server. Needs SMTP_HOST and SMTP_LIVE_TEST_TO (a mailbox you can check) —
 * fails on purpose without them instead of silently passing via the no-op.
 * Run with `pnpm run test:live`.
 */
describe("sendTransactionalEmail — live SMTP server", () => {
  it("delivers a mail to the configured SMTP server", async () => {
    expect(process.env.SMTP_HOST, "SMTP_HOST muss gesetzt sein").toBeTruthy();
    const to = process.env.SMTP_LIVE_TEST_TO;
    expect(to, "SMTP_LIVE_TEST_TO muss gesetzt sein").toBeTruthy();

    await expect(
      sendTransactionalEmail({
        to: to!,
        subject: "Mailer Live-Test",
        html: "<p>Testmail vom SMTP-Live-Test.</p>",
      }),
    ).resolves.toBeUndefined();
  }, 20_000);
});
