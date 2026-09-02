import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeeplePermissionMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeplePermission: requireMeeplePermissionMock };
});

const generateClientTokenMock = vi.fn();
vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: (...args: unknown[]) =>
    generateClientTokenMock(...args),
}));

const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));

const {
  createLfgAttachment,
  deleteLfgAttachment,
  getLfgAttachmentUploadToken,
} = await import("./attachment-actions");

const CREATOR = { id: "meeple-creator", neonAuthUserId: "auth-creator" };
const PARTICIPANT = {
  id: "meeple-participant",
  neonAuthUserId: "auth-participant",
};
const OUTSIDER = { id: "meeple-outsider", neonAuthUserId: "auth-outsider" };

const TODAY = new Date("2026-08-01T12:00:00Z");
const YESTERDAY = new Date("2026-07-31T00:00:00Z");
const TOMORROW = new Date("2026-08-02T00:00:00Z");

function post(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "post-1",
    createdByMeepleId: CREATOR.id,
    plannedAt: YESTERDAY,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(TODAY);
  requireMeeplePermissionMock.mockResolvedValue(CREATOR);
  prismaMock.lfgParticipant.findFirst.mockResolvedValue({} as never);
});

describe("getLfgAttachmentUploadToken", () => {
  it("issues a token for a participant of an eligible post", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    generateClientTokenMock.mockResolvedValue({ token: "tok" });

    const result = await getLfgAttachmentUploadToken("post-1", "foo.png");

    expect(result).toEqual({ token: "tok" });
    expect(generateClientTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "lfg-attachments/foo.png" }),
    );
  });

  it("rejects an unplanned post's uploads", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ plannedAt: null }) as never,
    );

    await expect(
      getLfgAttachmentUploadToken("post-1", "foo.png"),
    ).rejects.toThrow("Uploads sind erst am oder nach dem geplanten Termin");
    expect(generateClientTokenMock).not.toHaveBeenCalled();
  });

  it("rejects a future post's uploads", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ plannedAt: TOMORROW }) as never,
    );

    await expect(
      getLfgAttachmentUploadToken("post-1", "foo.png"),
    ).rejects.toThrow("Uploads sind erst am oder nach dem geplanten Termin");
  });

  it("rejects a non-participant", async () => {
    requireMeeplePermissionMock.mockResolvedValue(OUTSIDER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgParticipant.findFirst.mockResolvedValue(null);

    await expect(
      getLfgAttachmentUploadToken("post-1", "foo.png"),
    ).rejects.toThrow("Nur Teilnehmende können darauf zugreifen.");
  });
});

describe("createLfgAttachment", () => {
  it("records the attachment for a participant", async () => {
    requireMeeplePermissionMock.mockResolvedValue(PARTICIPANT);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgAttachment.create.mockResolvedValue({} as never);

    const result = await createLfgAttachment(
      "post-1",
      "https://blob/foo.png",
      "foo.png",
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.lfgAttachment.create).toHaveBeenCalledWith({
      data: {
        postId: "post-1",
        uploadedByMeepleId: PARTICIPANT.id,
        url: "https://blob/foo.png",
        filename: "foo.png",
      },
    });
  });

  it("rejects a non-participant", async () => {
    requireMeeplePermissionMock.mockResolvedValue(OUTSIDER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgParticipant.findFirst.mockResolvedValue(null);

    const result = await createLfgAttachment(
      "post-1",
      "https://blob/foo.png",
      "foo.png",
    );

    expect(result).toEqual({
      error: "Nur Teilnehmende können darauf zugreifen.",
    });
    expect(prismaMock.lfgAttachment.create).not.toHaveBeenCalled();
  });

  it("rejects an ineligible post", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ plannedAt: TOMORROW }) as never,
    );

    const result = await createLfgAttachment(
      "post-1",
      "https://blob/foo.png",
      "foo.png",
    );

    expect(result).toEqual({
      error: "Uploads sind erst am oder nach dem geplanten Termin möglich.",
    });
    expect(prismaMock.lfgAttachment.create).not.toHaveBeenCalled();
  });
});

describe("deleteLfgAttachment", () => {
  function attachment(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "attachment-1",
      url: "https://blob/foo.png",
      uploadedByMeepleId: PARTICIPANT.id,
      post: { id: "post-1", createdByMeepleId: CREATOR.id },
      ...overrides,
    };
  }

  it("lets the uploader delete their own attachment", async () => {
    requireMeeplePermissionMock.mockResolvedValue(PARTICIPANT);
    prismaMock.lfgAttachment.findUnique.mockResolvedValue(
      attachment() as never,
    );
    prismaMock.lfgAttachment.delete.mockResolvedValue({} as never);

    const result = await deleteLfgAttachment("attachment-1");

    expect(result).toEqual({ success: true });
    expect(deleteBlobsMock).toHaveBeenCalledWith(["https://blob/foo.png"]);
    expect(prismaMock.lfgAttachment.delete).toHaveBeenCalledWith({
      where: { id: "attachment-1" },
    });
  });

  it("lets the post creator delete someone else's attachment", async () => {
    prismaMock.lfgAttachment.findUnique.mockResolvedValue(
      attachment() as never,
    );
    prismaMock.lfgAttachment.delete.mockResolvedValue({} as never);

    const result = await deleteLfgAttachment("attachment-1");

    expect(result).toEqual({ success: true });
  });

  it("rejects deletion by someone who neither uploaded nor created the post", async () => {
    requireMeeplePermissionMock.mockResolvedValue(OUTSIDER);
    prismaMock.lfgAttachment.findUnique.mockResolvedValue(
      attachment() as never,
    );

    const result = await deleteLfgAttachment("attachment-1");

    expect(result).toEqual({ error: "Du kannst diese Datei nicht löschen." });
    expect(prismaMock.lfgAttachment.delete).not.toHaveBeenCalled();
    expect(deleteBlobsMock).not.toHaveBeenCalled();
  });

  it("rejects when the attachment doesn't exist", async () => {
    prismaMock.lfgAttachment.findUnique.mockResolvedValue(null);

    const result = await deleteLfgAttachment("attachment-1");

    expect(result).toEqual({ error: "Datei nicht gefunden." });
  });
});
