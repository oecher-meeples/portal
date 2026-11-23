import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { stubS3Env, TEST_S3_PUBLIC_BASE } from "@/lib/__mocks__/s3-env";

stubS3Env();
/** Upload-URL aus dem Client und der daraus gespeicherte Key (#112). */
const UPLOAD_URL = `${TEST_S3_PUBLIC_BASE}/lfg-attachments/foo.png`;
const STORED_KEY = "lfg-attachments/foo.png";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeeplePermissionMock = vi.fn();

const createBlobUploadTokenMock = vi.fn();
vi.mock("@/lib/utils/blob-upload-token", () => ({
  createBlobUploadToken: (...args: unknown[]) =>
    createBlobUploadTokenMock(...args),
}));

const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom((...args) =>
    requireMeeplePermissionMock(...args),
  ),
);

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
    createBlobUploadTokenMock.mockResolvedValue({ token: "tok" });

    const result = await getLfgAttachmentUploadToken(
      "post-1",
      "foo.png",
      "image/png",
    );

    expect(result).toEqual({ token: "tok" });
    expect(createBlobUploadTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "lfg-attachments/foo.png" }),
    );
  });

  it("rejects an unplanned post's uploads", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ plannedAt: null }) as never,
    );

    await expect(
      getLfgAttachmentUploadToken("post-1", "foo.png", "image/png"),
    ).rejects.toThrow("Uploads sind erst am oder nach dem geplanten Termin");
    expect(createBlobUploadTokenMock).not.toHaveBeenCalled();
  });

  it("rejects a future post's uploads", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ plannedAt: TOMORROW }) as never,
    );

    await expect(
      getLfgAttachmentUploadToken("post-1", "foo.png", "image/png"),
    ).rejects.toThrow("Uploads sind erst am oder nach dem geplanten Termin");
  });

  it("refuses a key outside lfg-attachments/ (#112)", async () => {
    requireMeeplePermissionMock.mockResolvedValue(PARTICIPANT);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);

    await expect(
      createLfgAttachment("post-1", "downloads/satzung.pdf", "satzung.pdf"),
    ).rejects.toThrow("Ungültiger Dateiverweis.");
    expect(prismaMock.lfgAttachment.create).not.toHaveBeenCalled();
  });

  it("rejects a non-participant", async () => {
    requireMeeplePermissionMock.mockResolvedValue(OUTSIDER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgParticipant.findFirst.mockResolvedValue(null);

    await expect(
      getLfgAttachmentUploadToken("post-1", "foo.png", "image/png"),
    ).rejects.toThrow("Nur Teilnehmende können darauf zugreifen.");
  });
});

describe("createLfgAttachment", () => {
  it("records the attachment for a participant", async () => {
    requireMeeplePermissionMock.mockResolvedValue(PARTICIPANT);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgAttachment.create.mockResolvedValue({} as never);

    const result = await createLfgAttachment("post-1", UPLOAD_URL, "foo.png");

    expect(result).toEqual({ success: true });
    expect(prismaMock.lfgAttachment.create).toHaveBeenCalledWith({
      data: {
        postId: "post-1",
        uploadedByMeepleId: PARTICIPANT.id,
        key: STORED_KEY,
        filename: "foo.png",
      },
    });
  });

  it("refuses a key outside lfg-attachments/ (#112)", async () => {
    requireMeeplePermissionMock.mockResolvedValue(PARTICIPANT);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);

    await expect(
      createLfgAttachment("post-1", "downloads/satzung.pdf", "satzung.pdf"),
    ).rejects.toThrow("Ungültiger Dateiverweis.");
    expect(prismaMock.lfgAttachment.create).not.toHaveBeenCalled();
  });

  it("rejects a non-participant", async () => {
    requireMeeplePermissionMock.mockResolvedValue(OUTSIDER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgParticipant.findFirst.mockResolvedValue(null);

    const result = await createLfgAttachment("post-1", UPLOAD_URL, "foo.png");

    expect(result).toEqual({
      error: "Nur Teilnehmende können darauf zugreifen.",
    });
    expect(prismaMock.lfgAttachment.create).not.toHaveBeenCalled();
  });

  it("rejects an ineligible post", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ plannedAt: TOMORROW }) as never,
    );

    const result = await createLfgAttachment("post-1", UPLOAD_URL, "foo.png");

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
      key: STORED_KEY,
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
    expect(deleteBlobsMock).toHaveBeenCalledWith([STORED_KEY]);
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
