import { describe, expect, it } from "vitest";
import { sendTransactionalEmail } from "./mailer";

/**
 * Hits the real Brevo API. Not part of the deterministic suite (see
 * subscribers.test.ts/dispatch.test.ts, which mock this module) — it's the
 * only test that can catch a change on Brevo's side. Fails as expected
 * without a real BREVO_API_KEY; run explicitly with one set:
 * `npm run test:live`.
 */
describe("sendTransactionalEmail — live Brevo API", () => {
  it("sends a transactional email through the real Brevo API", async () => {
    await expect(
      sendTransactionalEmail({
        to: "test@example.com",
        subject: "Newsletter-Feature Live-Test",
        html: "<p>Testmail vom Live-Test.</p>",
      }),
    ).resolves.toBeUndefined();
  });
});
