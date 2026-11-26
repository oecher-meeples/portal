import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const uploadFilesMock = vi.fn();
let uploadError: string | null = null;
vi.mock("@/lib/utils/use-blob-upload", () => ({
  useBlobUpload: () => ({
    uploadFiles: (...args: unknown[]) => uploadFilesMock(...args),
    isUploading: false,
    error: uploadError,
  }),
}));
vi.mock("@/lib/utils/compress-image", () => ({
  compressImage: async (file: File) => file,
}));
const registerPostImageMock = vi.fn();
vi.mock("@/components/feature/admin-news/post-image-actions", () => ({
  getPostImageUploadToken: vi.fn(),
  registerPostImage: (...args: unknown[]) => registerPostImageMock(...args),
}));

const { PostImageInsertButton, insertAtSelection } =
  await import("./post-image-field");

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <>
      <textarea
        ref={ref}
        aria-label="body"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <PostImageInsertButton textareaRef={ref} onChange={setValue} />
    </>
  );
}

const FILE_INPUT = "Bild für den Beitrag auswählen";

function pngFile(name = "Sommer_Fest.png", size = 10) {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

describe("insertAtSelection", () => {
  it("inserts at the cursor and replaces a selection", () => {
    expect(insertAtSelection("ab", 1, 1, "X")).toBe("aXb");
    expect(insertAtSelection("abc", 1, 2, "X")).toBe("aXc");
  });
});

describe("PostImageInsertButton", () => {
  it("uploads, registers and inserts markdown at the cursor", async () => {
    const user = userEvent.setup();
    uploadError = null;
    uploadFilesMock.mockResolvedValue(["https://s3/blog-images/a.png"]);
    registerPostImageMock.mockResolvedValue({
      success: true,
      id: "img1",
      url: "/api/blog-images/img1",
    });
    render(<Harness initial="VorherNachher" />);
    const textarea = screen.getByLabelText("body") as HTMLTextAreaElement;
    textarea.setSelectionRange(6, 6);

    await user.upload(screen.getByLabelText(FILE_INPUT), pngFile());

    await waitFor(() =>
      expect(textarea).toHaveValue(
        "Vorher![Sommer Fest](/api/blog-images/img1)Nachher",
      ),
    );
    expect(registerPostImageMock).toHaveBeenCalledWith(
      "https://s3/blog-images/a.png",
    );
  });

  it("shows the error when registration fails and inserts nothing", async () => {
    const user = userEvent.setup();
    uploadError = null;
    uploadFilesMock.mockResolvedValue(["https://s3/x.png"]);
    registerPostImageMock.mockResolvedValue({ error: "Keine Berechtigung." });
    render(<Harness initial="Text" />);

    await user.upload(screen.getByLabelText(FILE_INPUT), pngFile());

    expect(await screen.findByText("Keine Berechtigung.")).toBeVisible();
    expect(screen.getByLabelText("body")).toHaveValue("Text");
  });

  it("rejects files that are too large without uploading", async () => {
    const user = userEvent.setup();
    uploadError = null;
    render(<Harness initial="" />);

    await user.upload(
      screen.getByLabelText(FILE_INPUT),
      pngFile("big.png", 10 * 1024 * 1024 + 1),
    );

    expect(
      await screen.findByText("Das Bild ist größer als 10 MB."),
    ).toBeVisible();
    expect(uploadFilesMock).not.toHaveBeenCalled();
  });

  it("rejects non-image types", async () => {
    const user = userEvent.setup({ applyAccept: false });
    uploadError = null;
    render(<Harness initial="" />);

    await user.upload(
      screen.getByLabelText(FILE_INPUT),
      new File(["x"], "a.gif", { type: "image/gif" }),
    );

    expect(
      await screen.findByText("Nur PNG-, JPEG- und WebP-Bilder sind erlaubt."),
    ).toBeVisible();
    expect(uploadFilesMock).not.toHaveBeenCalled();
  });

  it("surfaces upload errors from the blob upload hook", () => {
    uploadError = "Datei(en) konnten nicht hochgeladen werden.";
    render(<Harness initial="" />);
    expect(
      screen.getByText("Datei(en) konnten nicht hochgeladen werden."),
    ).toBeVisible();
  });
});
