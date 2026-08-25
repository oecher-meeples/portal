import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cropImage } from "@/lib/utils/crop-image";

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 400;
  height = 300;
  private _src = "";

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }

  get src() {
    return this._src;
  }
}

describe("cropImage", () => {
  let drawImageCalls: unknown[][] = [];

  beforeEach(() => {
    drawImageCalls = [];
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: (...args: unknown[]) => drawImageCalls.push(args),
    } as unknown as CanvasRenderingContext2D);

    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      function (this: HTMLCanvasElement, callback) {
        callback(new Blob(["fake-image-data"], { type: "image/webp" }));
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("crops to the requested pixel region and encodes as webp", async () => {
    const source = new File(["original"], "photo.jpg", { type: "image/jpeg" });
    const result = await cropImage(source, {
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    });

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe("photo.webp");
    expect(result.type).toBe("image/webp");
    expect(drawImageCalls).toHaveLength(1);
    expect(drawImageCalls[0]).toEqual([
      expect.any(FakeImage),
      10,
      20,
      100,
      80,
      0,
      0,
      100,
      80,
    ]);
  });

  it("rounds fractional crop dimensions to whole canvas pixels", async () => {
    const source = new File(["original"], "photo.png", { type: "image/png" });
    const result = await cropImage(source, {
      x: 0,
      y: 0,
      width: 50.4,
      height: 30.6,
    });

    expect(result.name).toBe("photo.webp");
  });

  it("rejects when the canvas cannot produce a blob", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      function (this: HTMLCanvasElement, callback) {
        callback(null);
      },
    );

    const source = new File(["original"], "photo.jpg", { type: "image/jpeg" });
    await expect(
      cropImage(source, { x: 0, y: 0, width: 10, height: 10 }),
    ).rejects.toThrow("Zuschneiden fehlgeschlagen.");
  });

  it("rejects when the image fails to load", async () => {
    class FailingImage extends FakeImage {
      set src(value: string) {
        queueMicrotask(() => this.onerror?.());
      }
      get src() {
        return "";
      }
    }
    vi.stubGlobal("Image", FailingImage as unknown as typeof Image);

    const source = new File(["original"], "photo.jpg", { type: "image/jpeg" });
    await expect(
      cropImage(source, { x: 0, y: 0, width: 10, height: 10 }),
    ).rejects.toThrow("Bild konnte nicht geladen werden.");
  });
});
