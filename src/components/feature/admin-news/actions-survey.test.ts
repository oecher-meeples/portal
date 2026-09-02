import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

vi.mock("@/lib/instagram/queue", () => ({ processPost: vi.fn() }));

vi.mock("@/lib/newsletter/dispatch", () => ({
  queueNewsletterForPost: vi.fn(),
}));

vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: vi.fn(),
}));

const { createPost, updatePost } = await import("./actions");

const VALID_INPUT = {
  type: "blog" as const,
  title: "Neuer Beitrag",
  excerpt: "Kurzbeschreibung",
  body: "Inhalt des Beitrags",
  date: "2026-08-01",
  status: "PUBLISHED" as const,
};

describe("Umfrage-Beiträge (#2)", () => {
  const SURVEY_INPUT = { ...VALID_INPUT, type: "umfrage" as const };

  it("rejects publishing without a surveyEditLink", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await createPost(SURVEY_INPUT);

    expect(result).toEqual({
      error:
        "Bitte einen Bearbeiten-/Auswertungslink für die Umfrage angeben, um sie zu veröffentlichen.",
    });
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("allows saving a survey draft without a surveyEditLink", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    const result = await createPost({ ...SURVEY_INPUT, status: "DRAFT" });

    expect(result).toEqual({ success: true, id: "post-1" });
  });

  it("creates a surveyDetails row with the given fields when publishing", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost({
      ...SURVEY_INPUT,
      surveyDeadline: "2026-09-01",
      surveyEditLink: "https://forms.example/edit",
      surveyAnalysisLink: "https://forms.example/results",
    });

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        surveyDetails: {
          create: {
            deadline: new Date("2026-09-01"),
            editLink: "https://forms.example/edit",
            analysisLink: "https://forms.example/results",
          },
        },
      }),
    });
  });

  it("creates no surveyDetails row for a non-survey post", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost(VALID_INPUT);

    const call = prismaMock.post.create.mock.calls.at(-1)?.[0];
    expect(call?.data).not.toHaveProperty("surveyDetails");
  });

  it("deletes an existing surveyDetails row when the type changes away from umfrage", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.findUnique.mockResolvedValue({
      internal: null,
      newsletterStatus: null,
      instagramDetails: null,
      surveyDetails: { id: "survey-1" },
    } as never);

    await updatePost("post-1", VALID_INPUT);

    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({ surveyDetails: { delete: true } }),
    });
  });

  it("updates an existing surveyDetails row in place", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.findUnique.mockResolvedValue({
      internal: null,
      newsletterStatus: null,
      instagramDetails: null,
      surveyDetails: { id: "survey-1" },
    } as never);

    await updatePost("post-1", {
      ...SURVEY_INPUT,
      surveyEditLink: "https://forms.example/edit",
    });

    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({
        surveyDetails: {
          update: {
            deadline: null,
            editLink: "https://forms.example/edit",
            analysisLink: null,
          },
        },
      }),
    });
  });
});
