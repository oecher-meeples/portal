import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const runImportMock = vi.fn();
vi.mock("@/lib/ludothek/private-collection-import", () => ({
  runBggCollectionImport: (...args: unknown[]) => runImportMock(...args),
}));

const { enqueuePrivateCollectionImport, processPrivateCollectionImportQueue } =
  await import("./private-collection-import-queue");

const JOB = {
  id: "job-1",
  meeple: { id: "meeple-1", bggUsername: "lea_bgg", importWantToPlay: true },
};
const jobs = prismaMock.privateCollectionImportJob;

beforeEach(() => {
  vi.clearAllMocks();
  jobs.updateMany.mockResolvedValue({ count: 0 });
  jobs.findFirst.mockResolvedValue(null);
});

describe("enqueuePrivateCollectionImport (#632)", () => {
  it("creates a job when none is active", async () => {
    jobs.create.mockResolvedValue({ id: "job-1" } as never);

    expect(await enqueuePrivateCollectionImport("meeple-1")).toEqual({
      created: true,
      jobId: "job-1",
    });
    expect(jobs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { meepleId: "meeple-1" } }),
    );
  });

  it("does not queue a second job while one is pending or running", async () => {
    jobs.findFirst.mockResolvedValue({ id: "job-0" } as never);

    expect(await enqueuePrivateCollectionImport("meeple-1")).toEqual({
      created: false,
      jobId: "job-0",
    });
    expect(jobs.create).not.toHaveBeenCalled();
  });
});

describe("processPrivateCollectionImportQueue (#632)", () => {
  it("does nothing on an empty queue", async () => {
    expect(await processPrivateCollectionImportQueue()).toEqual({
      processed: 0,
    });
    expect(runImportMock).not.toHaveBeenCalled();
  });

  it("claims a job, runs the import and marks it DONE", async () => {
    jobs.findFirst.mockResolvedValueOnce(JOB as never);
    jobs.updateMany
      .mockResolvedValueOnce({ count: 0 }) // requeue stale
      .mockResolvedValueOnce({ count: 1 }); // claim
    runImportMock.mockResolvedValue({ success: true, imported: 7 });

    expect(await processPrivateCollectionImportQueue()).toEqual({
      processed: 1,
    });
    expect(runImportMock).toHaveBeenCalledWith({
      id: "meeple-1",
      bggUsername: "lea_bgg",
      importWantToPlay: true,
    });
    expect(jobs.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: "DONE",
        importedCount: 7,
        wantToPlayCount: null,
        wantToPlayError: null,
      }),
    });
  });

  it("schreibt Anzahl bzw. Fehler des Want-to-Play-Teils an den Job, Status bleibt DONE", async () => {
    for (const [wantToPlay, expected] of [
      [{ count: 4 }, { wantToPlayCount: 4, wantToPlayError: null }],
      [
        { error: "BGG down" },
        { wantToPlayCount: null, wantToPlayError: "BGG down" },
      ],
    ] as const) {
      jobs.update.mockClear();
      jobs.findFirst.mockResolvedValueOnce(JOB as never);
      jobs.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 1 });
      runImportMock.mockResolvedValue({
        success: true,
        imported: 7,
        wantToPlay,
      });

      await processPrivateCollectionImportQueue();

      expect(jobs.update).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "DONE", ...expected }),
      });
    }
  });

  it("skips a job another worker claimed first", async () => {
    jobs.findFirst.mockResolvedValueOnce(JOB as never);
    jobs.updateMany.mockResolvedValue({ count: 0 });

    expect(await processPrivateCollectionImportQueue()).toEqual({
      processed: 0,
    });
    expect(runImportMock).not.toHaveBeenCalled();
  });

  it("marks the job FAILED with the import's error message", async () => {
    jobs.findFirst.mockResolvedValueOnce(JOB as never);
    jobs.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    runImportMock.mockResolvedValue({ error: "Collection ist privat." });

    await processPrivateCollectionImportQueue();

    expect(jobs.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: "FAILED",
        error: "Collection ist privat.",
      }),
    });
  });

  it("marks the job FAILED instead of throwing on an unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    jobs.findFirst.mockResolvedValueOnce(JOB as never);
    jobs.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    runImportMock.mockRejectedValue(new Error("db down"));

    await expect(processPrivateCollectionImportQueue()).resolves.toEqual({
      processed: 1,
    });
    expect(jobs.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: "FAILED",
        error: "Import fehlgeschlagen.",
      }),
    });
  });
});
