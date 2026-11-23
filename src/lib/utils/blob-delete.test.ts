import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { deleteBlobs } from "@/lib/utils/blob-delete";
import { stubS3Env, TEST_S3_PUBLIC_BASE } from "@/lib/__mocks__/s3-env";

const sendMock = vi.fn();

beforeEach(() => {
  stubS3Env();
  sendMock.mockReset().mockResolvedValue({});
  vi.spyOn(S3Client.prototype, "send").mockImplementation(sendMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function deletedKeys(call: number) {
  const command = sendMock.mock.calls[call][0] as DeleteObjectsCommand;
  expect(command).toBeInstanceOf(DeleteObjectsCommand);
  return command.input.Delete?.Objects?.map((object) => object.Key);
}

describe("deleteBlobs", () => {
  it("deletes all given urls in one call", async () => {
    await deleteBlobs([
      `${TEST_S3_PUBLIC_BASE}/a.jpg`,
      `${TEST_S3_PUBLIC_BASE}/dir/b.jpg`,
    ]);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(deletedKeys(0)).toEqual(["a.jpg", "dir/b.jpg"]);
  });

  it("does not call the blob api for an empty list", async () => {
    await deleteBlobs([]);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("ignores blank entries rather than asking the api to delete an empty path", async () => {
    await deleteBlobs(["", "   ", `${TEST_S3_PUBLIC_BASE}/a.jpg`]);

    expect(deletedKeys(0)).toEqual(["a.jpg"]);
  });

  it("does not call the blob api when only blank entries are given", async () => {
    await deleteBlobs(["", "  "]);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips urls outside the bucket (legacy Vercel Blob, external hotlinks)", async () => {
    await deleteBlobs([
      "https://abc.public.blob.vercel-storage.com/old.jpg",
      `${TEST_S3_PUBLIC_BASE}/a.jpg`,
    ]);

    expect(deletedKeys(0)).toEqual(["a.jpg"]);
  });

  it("splits more than 1000 keys into several requests", async () => {
    const urls = Array.from(
      { length: 1001 },
      (_, i) => `${TEST_S3_PUBLIC_BASE}/${i}.jpg`,
    );

    await deleteBlobs(urls);

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(deletedKeys(1)).toEqual(["1000.jpg"]);
  });

  it("propagates a failure so the caller can keep the reference and retry", async () => {
    sendMock.mockRejectedValue(new Error("blob boom"));

    await expect(deleteBlobs([`${TEST_S3_PUBLIC_BASE}/a.jpg`])).rejects.toThrow(
      "blob boom",
    );
  });

  it("propagates per-key errors that S3 reports with HTTP 200", async () => {
    sendMock.mockResolvedValue({
      Errors: [{ Key: "a.jpg", Code: "AccessDenied" }],
    });

    await expect(deleteBlobs([`${TEST_S3_PUBLIC_BASE}/a.jpg`])).rejects.toThrow(
      "Blob a.jpg konnte nicht gelöscht werden: AccessDenied",
    );
  });
});
