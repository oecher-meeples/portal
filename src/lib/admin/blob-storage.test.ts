import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getBlobStorageUsage } from "@/lib/admin/blob-storage";
import { stubS3Env } from "@/lib/__mocks__/s3-env";

const ONE_GB = 1 * 1024 * 1024 * 1024;
const sendMock = vi.fn();

beforeEach(() => {
  stubS3Env();
  sendMock.mockReset();
  vi.spyOn(S3Client.prototype, "send").mockImplementation(sendMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getBlobStorageUsage", () => {
  it("sums object sizes from a single page", async () => {
    sendMock.mockResolvedValue({
      Contents: [{ Size: 1000 }, { Size: 2000 }, {}],
      IsTruncated: false,
    });

    const result = await getBlobStorageUsage();

    expect(result.used).toBe(3000);
    expect(result.limit).toBe(ONE_GB);
    expect(result.percent).toBeCloseTo((3000 / ONE_GB) * 100);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0] as ListObjectsV2Command;
    expect(command).toBeInstanceOf(ListObjectsV2Command);
    expect(command.input).toMatchObject({ Bucket: "meeples", MaxKeys: 1000 });
  });

  it("paginates through multiple pages until the listing is complete", async () => {
    sendMock
      .mockResolvedValueOnce({
        Contents: [{ Size: 1000 }],
        IsTruncated: true,
        NextContinuationToken: "cursor-1",
      })
      .mockResolvedValueOnce({ Contents: [{ Size: 500 }], IsTruncated: false });

    const result = await getBlobStorageUsage();

    expect(result.used).toBe(1500);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(
      (sendMock.mock.calls[1][0] as ListObjectsV2Command).input
        .ContinuationToken,
    ).toBe("cursor-1");
  });

  it("handles an empty bucket", async () => {
    sendMock.mockResolvedValue({ IsTruncated: false });

    expect((await getBlobStorageUsage()).used).toBe(0);
  });

  it("uses S3_STORAGE_LIMIT_BYTES as the quota when set", async () => {
    vi.stubEnv("S3_STORAGE_LIMIT_BYTES", "4000");
    sendMock.mockResolvedValue({ Contents: [{ Size: 1000 }] });

    const result = await getBlobStorageUsage();

    expect(result.limit).toBe(4000);
    expect(result.percent).toBe(25);
  });

  it("throws with a clear message when the bucket is not configured", async () => {
    vi.stubEnv("S3_BUCKET", "");

    await expect(getBlobStorageUsage()).rejects.toThrow("S3_BUCKET");
  });
});
