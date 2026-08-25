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

vi.mock("react-easy-crop", () => ({
  default: ({
    onCropComplete,
  }: {
    onCropComplete?: (
      area: { x: number; y: number; width: number; height: number },
      areaPixels: { x: number; y: number; width: number; height: number },
    ) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onCropComplete?.(
          { x: 0, y: 0, width: 1, height: 1 },
          { x: 5, y: 10, width: 200, height: 150 },
        )
      }
    >
      simulate-crop-complete
    </button>
  ),
}));

beforeAll(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock"),
    revokeObjectURL: vi.fn(),
  });
});

describe("ImageCropDialog", () => {
  const file = new File(["source"], "photo.jpg", { type: "image/jpeg" });

  it("confirms with the cropped file once a crop region was selected", async () => {
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

    fireEvent.click(screen.getByText("simulate-crop-complete"));
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await vi.waitFor(() => {
      expect(onCropped).toHaveBeenCalledWith(croppedFile);
    });
    expect(cropImage).toHaveBeenCalledWith(
      file,
      { x: 5, y: 10, width: 200, height: 150 },
      { fileName: "photo.jpg" },
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
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

    fireEvent.click(screen.getByText("simulate-crop-complete"));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(onCropped).not.toHaveBeenCalled();
    expect(cropImage).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
