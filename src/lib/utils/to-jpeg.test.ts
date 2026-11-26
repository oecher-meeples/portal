import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { toJpeg } from "./to-jpeg";

describe("toJpeg", () => {
  it("converts a transparent png to jpeg", async () => {
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

    const jpeg = await toJpeg(png);

    expect((await sharp(jpeg).metadata()).format).toBe("jpeg");
  });
});
