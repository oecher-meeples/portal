import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));
const getSessionTierMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSessionTier: getSessionTierMock }));
const getBlobMock = vi.fn();
vi.mock("@/lib/utils/s3", () => ({ getBlob: (k: string) => getBlobMock(k) }));

const { GET } = await import("./route");

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const request = new Request("http://localhost/api/blog-images/img1");

function image(post: { status: string; internal: boolean | null } | null) {
  prismaMock.postImage.findUnique.mockResolvedValue({
    key: "blog-images/a.png",
    post,
  } as never);
}

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue(null);
  getSessionTierMock.mockResolvedValue("gast");
  getBlobMock.mockResolvedValue({
    bytes: new Uint8Array([1, 2, 3]),
    contentType: "image/png",
  });
});

describe("GET /api/blog-images/[id]", () => {
  it("404s for an unknown id", async () => {
    prismaMock.postImage.findUnique.mockResolvedValue(null);
    expect((await GET(request, ctx("nope"))).status).toBe(404);
  });

  it("serves images of public published posts to guests with public caching", async () => {
    image({ status: "PUBLISHED", internal: null });

    const response = await GET(request, ctx("img1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(getBlobMock).toHaveBeenCalledWith("blog-images/a.png");
  });

  it("404s (not 403) for internal posts as guest, even with the link", async () => {
    image({ status: "PUBLISHED", internal: true });

    const response = await GET(request, ctx("img1"));

    expect(response.status).toBe(404);
    expect(getBlobMock).not.toHaveBeenCalled();
  });

  it("serves internal post images privately to members with news:internal:view", async () => {
    image({ status: "PUBLISHED", internal: true });
    getCurrentUserMock.mockResolvedValue({ id: "u1" });
    getSessionTierMock.mockResolvedValue("mitglied");
    mockPermissionKeys(["news:internal:view"]);

    const response = await GET(request, ctx("img1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("private");
  });

  it("hides drafts from non-editors but shows them to editors", async () => {
    image({ status: "DRAFT", internal: null });
    getCurrentUserMock.mockResolvedValue({ id: "u1" });
    getSessionTierMock.mockResolvedValue("mitglied");
    mockPermissionKeys(["news:internal:view"]);
    expect((await GET(request, ctx("img1"))).status).toBe(404);

    mockPermissionKeys(["posts:public"]);
    const response = await GET(request, ctx("img1"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("private");
  });

  it("shows unlinked images only to editors", async () => {
    image(null);
    expect((await GET(request, ctx("img1"))).status).toBe(404);

    getCurrentUserMock.mockResolvedValue({ id: "u1" });
    getSessionTierMock.mockResolvedValue("mitglied");
    mockPermissionKeys(["posts:internal"]);
    expect((await GET(request, ctx("img1"))).status).toBe(200);
  });

  it("converts to jpeg on request for Instagram", async () => {
    image({ status: "PUBLISHED", internal: null });
    const png = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    getBlobMock.mockResolvedValue({ bytes: png, contentType: "image/png" });

    const response = await GET(
      new Request("http://localhost/api/blog-images/img1?format=jpeg"),
      ctx("img1"),
    );

    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect((await sharp(bytes).metadata()).format).toBe("jpeg");
  });

  it("404s when the file is missing in storage", async () => {
    image({ status: "PUBLISHED", internal: null });
    getBlobMock.mockResolvedValue(null);
    expect((await GET(request, ctx("img1"))).status).toBe(404);
  });
});
