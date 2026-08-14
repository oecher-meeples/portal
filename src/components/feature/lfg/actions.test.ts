import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeple: requireMeepleMock };
});

const {
  addLfgGuest,
  closeLfgPost,
  createLfgPost,
  joinLfgPost,
  leaveLfgPost,
  removeLfgGuest,
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
      data: {
        postId: "post-1",
        meepleId: "meeple-creator",
        addedByMeepleId: "meeple-creator",
      },
    });
  });

  it("rejects a missing title", async () => {
    const result = await createLfgPost({ ...VALID_INPUT, title: "" });

    expect(result).toEqual({ error: "Bitte einen Titel angeben." });
    expect(prismaMock.lfgPost.create).not.toHaveBeenCalled();
  });

  it("links the post to a board game when boardGameId is set", async () => {
    await createLfgPost({ ...VALID_INPUT, boardGameId: "board-1" });

    expect(prismaMock.lfgPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ boardGameId: "board-1" }),
    });
  });

  it("leaves boardGameId null and gameTitle usable without a selection", async () => {
    await createLfgPost({ ...VALID_INPUT, gameTitle: "Arche Nova" });

    expect(prismaMock.lfgPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        boardGameId: null,
        gameTitle: "Arche Nova",
      }),
    });
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
      data: {
        postId: "post-1",
        meepleId: "meeple-other",
        addedByMeepleId: "meeple-other",
      },
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
    prismaMock.lfgParticipant.deleteMany.mockResolvedValue({
      count: 1,
    } as never);

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

describe("addLfgGuest", () => {
  function post(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "post-1",
      maxParticipants: 4,
      plannedAt: null,
      closedAt: null,
      createdByMeepleId: CREATOR.id,
      guestsMayBringGuests: false,
      _count: { participants: 2 },
      ...overrides,
    };
  }

  beforeEach(() => {
    prismaMock.lfgParticipant.create.mockResolvedValue({} as never);
  });

  it("lets the creator add a guest even without guestsMayBringGuests", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);

    const result = await addLfgGuest("post-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.lfgParticipant.create).toHaveBeenCalledWith({
      data: {
        postId: "post-1",
        meepleId: null,
        addedByMeepleId: "meeple-creator",
      },
    });
  });

  it("rejects a non-creator when guestsMayBringGuests is off", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);

    const result = await addLfgGuest("post-1");

    expect(result).toEqual({
      error: "Gäste mitbringen ist für dieses Gesuch nicht erlaubt.",
    });
    expect(prismaMock.lfgParticipant.create).not.toHaveBeenCalled();
  });

  it("lets a joined participant add a guest when guestsMayBringGuests is on", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ guestsMayBringGuests: true }) as never,
    );
    prismaMock.lfgParticipant.findFirst.mockResolvedValue({} as never);

    const result = await addLfgGuest("post-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.lfgParticipant.create).toHaveBeenCalledWith({
      data: {
        postId: "post-1",
        meepleId: null,
        addedByMeepleId: "meeple-other",
      },
    });
  });

  it("rejects a non-participant even when guestsMayBringGuests is on", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ guestsMayBringGuests: true }) as never,
    );
    prismaMock.lfgParticipant.findFirst.mockResolvedValue(null);

    const result = await addLfgGuest("post-1");

    expect(result).toEqual({
      error: "Nur Teilnehmende können Gäste mitbringen.",
    });
    expect(prismaMock.lfgParticipant.create).not.toHaveBeenCalled();
  });

  it("rejects adding a guest to a full post", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ maxParticipants: 2 }) as never,
    );

    const result = await addLfgGuest("post-1");

    expect(result).toEqual({ error: "Dieses Gesuch ist bereits voll." });
    expect(prismaMock.lfgParticipant.create).not.toHaveBeenCalled();
  });
});

describe("removeLfgGuest", () => {
  function guestParticipant(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "participant-guest",
      postId: "post-1",
      meepleId: null,
      addedByMeepleId: "meeple-other",
      post: { createdByMeepleId: CREATOR.id },
      ...overrides,
    };
  }

  it("lets whoever added the guest remove them", async () => {
    requireMeepleMock.mockResolvedValue(OTHER);
    prismaMock.lfgParticipant.findUnique.mockResolvedValue(
      guestParticipant() as never,
    );
    prismaMock.lfgParticipant.delete.mockResolvedValue({} as never);

    const result = await removeLfgGuest("participant-guest");

    expect(result).toEqual({ success: true });
    expect(prismaMock.lfgParticipant.delete).toHaveBeenCalledWith({
      where: { id: "participant-guest" },
    });
  });

  it("lets the creator remove any guest", async () => {
    prismaMock.lfgParticipant.findUnique.mockResolvedValue(
      guestParticipant() as never,
    );
    prismaMock.lfgParticipant.delete.mockResolvedValue({} as never);

    const result = await removeLfgGuest("participant-guest");

    expect(result).toEqual({ success: true });
  });

  it("rejects removal by someone who neither added the guest nor created the post", async () => {
    requireMeepleMock.mockResolvedValue({
      id: "meeple-third",
      neonAuthUserId: "auth-third",
    });
    prismaMock.lfgParticipant.findUnique.mockResolvedValue(
      guestParticipant() as never,
    );

    const result = await removeLfgGuest("participant-guest");

    expect(result).toEqual({
      error: "Du kannst diesen Gast nicht entfernen.",
    });
    expect(prismaMock.lfgParticipant.delete).not.toHaveBeenCalled();
  });

  it("rejects when the participant is not a guest", async () => {
    prismaMock.lfgParticipant.findUnique.mockResolvedValue(
      guestParticipant({ meepleId: "meeple-real" }) as never,
    );

    const result = await removeLfgGuest("participant-guest");

    expect(result).toEqual({ error: "Gast nicht gefunden." });
    expect(prismaMock.lfgParticipant.delete).not.toHaveBeenCalled();
  });
});
