import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { cropImage } from "@/lib/utils/crop-image";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

vi.mock("@/lib/utils/crop-image", () => ({
  cropImage: vi.fn(),
}));

beforeAll(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock"),
    revokeObjectURL: vi.fn(),
  });
});

/** Simuliert das Laden des Vorschaubilds mit fester natürlicher Größe —
 * jsdom lädt `<img src="blob:…">` nie wirklich (kein Netzwerk-Stack). */
function loadImage(naturalWidth: number, naturalHeight: number) {
  const img = document.querySelector("img") as HTMLImageElement;
  Object.defineProperty(img, "naturalWidth", {
    value: naturalWidth,
    configurable: true,
  });
  Object.defineProperty(img, "naturalHeight", {
    value: naturalHeight,
    configurable: true,
  });
  fireEvent.load(img);
}

describe("ImageCropDialog", () => {
  const file = new File(["source"], "photo.jpg", { type: "image/jpeg" });

  it("defaults to the full image once loaded and confirms with it", async () => {
    const croppedFile = new File(["cropped"], "photo.webp", {
      type: "image/webp",
    });
    vi.mocked(cropImage).mockResolvedValue(croppedFile);

    const onCropped = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ImageCropDialog
        open
        onOpenChange={onOpenChange}
        file={file}
        onCropped={onCropped}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Übernehmen" });
    expect(confirmButton).toBeDisabled();

    loadImage(400, 300);
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await vi.waitFor(() => {
      expect(onCropped).toHaveBeenCalledWith(croppedFile);
    });
    expect(cropImage).toHaveBeenCalledWith(
      file,
      { x: 0, y: 0, width: 400, height: 300 },
      { fileName: "photo.jpg" },
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shrinks the crop area from the right edge, mapped back to natural pixels", async () => {
    vi.mocked(cropImage).mockResolvedValue(
      new File(["cropped"], "photo.webp", { type: "image/webp" }),
    );
    render(
      <ImageCropDialog
        open
        onOpenChange={vi.fn()}
        file={file}
        onCropped={vi.fn()}
      />,
    );

    // 448×320 natural matches the display box exactly → scale is 1:1, so
    // display px == natural px, keeping the math below simple.
    loadImage(448, 320);

    const rightHandle = screen.getByLabelText("Rechten Rand ziehen");
    fireEvent.pointerDown(rightHandle, { clientX: 448, clientY: 160 });
    fireEvent.pointerMove(window, { clientX: 348, clientY: 160 });
    fireEvent.pointerUp(window);

    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    await vi.waitFor(() => {
      expect(cropImage).toHaveBeenCalledWith(
        file,
        { x: 0, y: 0, width: 348, height: 320 },
        { fileName: "photo.jpg" },
      );
    });
  });

  it("moves the crop area when dragging its interior", async () => {
    vi.mocked(cropImage).mockResolvedValue(
      new File(["cropped"], "photo.webp", { type: "image/webp" }),
    );
    render(
      <ImageCropDialog
        open
        onOpenChange={vi.fn()}
        file={file}
        onCropped={vi.fn()}
      />,
    );

    loadImage(448, 320);

    // Shrink first (from a full-width/height rect there's no room to move),
    // then drag the shrunk rect's interior.
    const rightHandle = screen.getByLabelText("Rechten Rand ziehen");
    fireEvent.pointerDown(rightHandle, { clientX: 448, clientY: 160 });
    fireEvent.pointerMove(window, { clientX: 348, clientY: 160 });
    fireEvent.pointerUp(window);

    const [interior] = screen
      .getAllByLabelText(/Rand ziehen/)
      .map((handle) => handle.parentElement as HTMLElement);
    fireEvent.pointerDown(interior, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 150, clientY: 100 });
    fireEvent.pointerUp(window);

    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    await vi.waitFor(() => {
      expect(cropImage).toHaveBeenCalledWith(
        file,
        { x: 50, y: 0, width: 348, height: 320 },
        { fileName: "photo.jpg" },
      );
    });
  });

  it("delivers no result when cancelled", () => {
    const onCropped = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ImageCropDialog
        open
        onOpenChange={onOpenChange}
        file={file}
        onCropped={onCropped}
      />,
    );

    loadImage(400, 300);
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(onCropped).not.toHaveBeenCalled();
    expect(cropImage).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
