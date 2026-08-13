import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const sendTransactionalEmailMock = vi.fn();
vi.mock("@/lib/newsletter/mailer", () => ({
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...args),
}));

const collectMeeplePersonalDataMock = vi.fn();
vi.mock("@/lib/members/data-export", () => ({
  collectMeeplePersonalData: (...args: unknown[]) =>
    collectMeeplePersonalDataMock(...args),
}));

const { sendSelbstauskunftMail } = await import("./selbstauskunft-mail");

beforeEach(() => {
  sendTransactionalEmailMock.mockReset().mockResolvedValue(undefined);
  collectMeeplePersonalDataMock
    .mockReset()
    .mockResolvedValue({ exportedAt: "2026-08-13T00:00:00.000Z" });
});

describe("sendSelbstauskunftMail", () => {
  it("returns an error when the Meeple doesn't exist", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(null);

    expect(await sendSelbstauskunftMail("meeple-1")).toEqual({
      error: "Mitglied nicht gefunden.",
    });
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it("returns an error when no email address is on file", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      id: "meeple-1",
      email: null,
      displayName: "Jan Herwig",
    } as never);

    expect(await sendSelbstauskunftMail("meeple-1")).toEqual({
      error: "Für dieses Mitglied ist keine E-Mail-Adresse hinterlegt.",
    });
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it("sends the collected data to the stored email address", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      id: "meeple-1",
      email: "jan@example.org",
      displayName: "Jan Herwig",
    } as never);

    expect(await sendSelbstauskunftMail("meeple-1")).toEqual({
      success: true,
    });

    expect(sendTransactionalEmailMock).toHaveBeenCalledWith({
      to: "jan@example.org",
      subject: "Deine Selbstauskunft (Art. 15/20 DSGVO)",
      html: expect.stringContaining("2026-08-13T00:00:00.000Z"),
    });
  });

  it("escapes the display name in the email body", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      id: "meeple-1",
      email: "jan@example.org",
      displayName: "<script>",
    } as never);

    await sendSelbstauskunftMail("meeple-1");

    const html = sendTransactionalEmailMock.mock.calls[0][0].html as string;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("turns a mailer failure into an error result instead of throwing", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      id: "meeple-1",
      email: "jan@example.org",
      displayName: "Jan Herwig",
    } as never);
    sendTransactionalEmailMock.mockRejectedValue(new Error("Brevo down"));

    expect(await sendSelbstauskunftMail("meeple-1")).toEqual({
      error: "Brevo down",
    });
  });
});
