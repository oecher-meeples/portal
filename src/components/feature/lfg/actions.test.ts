import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/meeples", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/meeples")>("@/lib/meeples");
  return { ...actual, requireMeeple: requireMeepleMock };
});

const {
  closeLfgPost,
  createLfgPost,
  joinLfgPost,
  leaveLfgPost,
} = await import("./actions");

class RedirectError extends Error {}

const CREATOR = { id: "meeple-creator", neonAuthUserId: "auth-creator" };
const OTHER = { id: "meeple-other", neonAuthUserId: "auth-other" };

const VALID_INPUT = {
  title: "Arche Nova am Freitag",
  description: "Suche Mitspielende",
  maxParticipants: 4,
};

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(CREATOR);
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  prismaMock.lfgPost.create.mockResolvedValue({ id: "post-1" } as never);
  prismaMock.lfgParticipant.create.mockResolvedValue({} as never);
  prismaMock.rolePermission.count.mockResolvedValue(0);
});

describe("without a session", () => {
  it("writes nothing", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(createLfgPost(VALID_INPUT)).rejects.toThrow(RedirectError);
    await expect(joinLfgPost("post-1")).rejects.toThrow(RedirectError);
    await expect(leaveLfgPost("post-1")).rejects.toThrow(RedirectError);
    await expect(closeLfgPost("post-1")).rejects.toThrow(RedirectError);
    expect(prismaMock.lfgPost.create).not.toHaveBeenCalled();
  });
});

describe("createLfgPost", () => {
  it("makes the creator the first participant", async () => {
    const result = await createLfgPost(VALID_INPUT);

    expect(result).toEqual({ success: true, id: "post-1" });
    expect(prismaMock.lfgPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Arche Nova am Freitag",
        createdByMeepleId: "meeple-creator",
      }),
    });
    expect(prismaMock.lfgParticipant.create).toHaveBeenCalledWith({
      data: { postId: "post-1", meepleId: "meeple-creator" },
    });
  });

  it("rejects a missing title", async () => {
    const result = await createLfgPost({ ...VALID_INPUT, title: "" });

    expect(result).toEqual({ error: "Bitte einen Titel angeben." });
    expect(prismaMock.lfgPost.create).not.toHaveBeenCalled();
  });
});

describe("joinLfgPost", () => {
  function post(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "post-1",
      maxParticipants: 4,
      plannedAt: null,
      closedAt: null,
      createdByMeepleId: CREATOR.id,
      _count: { participants: 1 },
      ...overrides,
    };
  }

  beforeEach(() => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.lfgParticipant.findUnique.mockResolvedValue(null);
    prismaMock.lfgParticipant.create.mockResolvedValue({} as never);
  });

  it("joins an open post", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);

    const result = await joinLfgPost("post-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.lfgParticipant.create).toHaveBeenCalledWith({
      data: { postId: "post-1", meepleId: "meeple-other" },
    });
  });

  it("rejects joining a full post", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ _count: { participants: 4 } }) as never,
    );

    const result = await joinLfgPost("post-1");

    expect(result).toEqual({ error: "Dieses Gesuch ist bereits voll." });
    expect(prismaMock.lfgParticipant.create).not.toHaveBeenCalled();
  });

  it("rejects joining a closed post", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ closedAt: new Date("2026-01-01T00:00:00Z") }) as never,
    );

    const result = await joinLfgPost("post-1");

    expect(result).toEqual({ error: "Dieses Gesuch ist geschlossen." });
  });

  it("rejects joining an expired post", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ plannedAt: new Date("2020-01-01T00:00:00Z") }) as never,
    );

    const result = await joinLfgPost("post-1");

    expect(result).toEqual({ error: "Dieses Gesuch ist abgelaufen." });
  });

  it("rejects a double join", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgParticipant.findUnique.mockResolvedValue({} as never);

    const result = await joinLfgPost("post-1");

    expect(result).toEqual({
      error: "Du nimmst bereits an diesem Gesuch teil.",
    });
    expect(prismaMock.lfgParticipant.create).not.toHaveBeenCalled();
  });
});

describe("leaveLfgPost", () => {
  it("prevents the creator from leaving", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue({
      id: "post-1",
      createdByMeepleId: CREATOR.id,
    } as never);

    const result = await leaveLfgPost("post-1");

    expect(result).toEqual({
      error: "Der Ersteller kann das eigene Gesuch nicht verlassen.",
    });
    expect(prismaMock.lfgParticipant.deleteMany).not.toHaveBeenCalled();
  });

  it("lets a participant leave", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.lfgPost.findUnique.mockResolvedValue({
      id: "post-1",
      createdByMeepleId: CREATOR.id,
    } as never);
    prismaMock.lfgParticipant.deleteMany.mockResolvedValue({ count: 1 } as never);

    const result = await leaveLfgPost("post-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.lfgParticipant.deleteMany).toHaveBeenCalledWith({
      where: { postId: "post-1", meepleId: "meeple-other" },
    });
  });
});

describe("closeLfgPost", () => {
  it("allows the creator to close", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue({
      id: "post-1",
      createdByMeepleId: CREATOR.id,
    } as never);
    prismaMock.lfgPost.update.mockResolvedValue({} as never);

    const result = await closeLfgPost("post-1");

    expect(result).toEqual({ success: true });
  });

  it("allows members:manage to close someone else's post", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.lfgPost.findUnique.mockResolvedValue({
      id: "post-1",
      createdByMeepleId: CREATOR.id,
    } as never);
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.lfgPost.update.mockResolvedValue({} as never);

    const result = await closeLfgPost("post-1");

    expect(result).toEqual({ success: true });
  });

  it("rejects a non-creator without members:manage", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.lfgPost.findUnique.mockResolvedValue({
      id: "post-1",
      createdByMeepleId: CREATOR.id,
    } as never);
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await closeLfgPost("post-1");

    expect(result).toEqual({
      error: "Nur der Ersteller oder die Mitgliederverwaltung kann schließen.",
    });
    expect(prismaMock.lfgPost.update).not.toHaveBeenCalled();
  });
});
