import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useBlobUpload } from "./use-blob-upload";

const putMock = vi.fn();
vi.mock("@vercel/blob/client", () => ({
  put: (...args: unknown[]) => putMock(...args),
}));

function file(name: string) {
  return new File(["content"], name, { type: "image/png" });
}

describe("useBlobUpload", () => {
  it("uploads multiple files and returns their urls in order", async () => {
    const getToken = vi.fn().mockResolvedValue("token-123");
    putMock
      .mockResolvedValueOnce({ url: "https://blob.example/a.png" })
      .mockResolvedValueOnce({ url: "https://blob.example/b.png" });

    const { result } = renderHook(() =>
      useBlobUpload("market-listings", getToken),
    );

    let urls: string[] = [];
    await act(async () => {
      urls = await result.current.uploadFiles([file("a.png"), file("b.png")]);
    });

    expect(urls).toEqual([
      "https://blob.example/a.png",
      "https://blob.example/b.png",
    ]);
    expect(getToken).toHaveBeenNthCalledWith(1, "market-listings/a.png");
    expect(getToken).toHaveBeenNthCalledWith(2, "market-listings/b.png");
    expect(result.current.error).toBeNull();
  });

  it("reports an error and returns no urls when the upload fails", async () => {
    const getToken = vi.fn().mockResolvedValue("token-123");
    putMock.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() =>
      useBlobUpload("market-listings", getToken),
    );

    let urls: string[] = [];
    await act(async () => {
      urls = await result.current.uploadFiles([file("a.png")]);
    });

    expect(urls).toEqual([]);
    await waitFor(() =>
      expect(result.current.error).toBe(
        "Datei(en) konnten nicht hochgeladen werden: network error",
      ),
    );
  });
});
