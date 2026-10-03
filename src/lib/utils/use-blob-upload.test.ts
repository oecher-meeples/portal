import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useBlobUpload } from "./use-blob-upload";

function file(name: string) {
  return new File(["content"], name, { type: "image/png" });
}

function token(name: string) {
  return {
    url: "https://files.example/meeples",
    fields: { key: `market-listings/${name}`, Policy: "policy" },
    publicUrl: `https://files.example/meeples/market-listings/${name}`,
  };
}

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("useBlobUpload", () => {
  it("uploads multiple files and returns their urls in order", async () => {
    vi.stubGlobal("fetch", fetchMock.mockResolvedValue({ ok: true }));
    const getToken = vi
      .fn()
      .mockResolvedValueOnce(token("a.png"))
      .mockResolvedValueOnce(token("b.png"));

    const { result } = renderHook(() =>
      useBlobUpload("market-listings", getToken),
    );

    let urls: string[] = [];
    await act(async () => {
      urls = await result.current.uploadFiles([file("a.png"), file("b.png")]);
    });

    expect(urls).toEqual([
      "https://files.example/meeples/market-listings/a.png",
      "https://files.example/meeples/market-listings/b.png",
    ]);
    expect(getToken).toHaveBeenNthCalledWith(
      1,
      "market-listings/a.png",
      "image/png",
    );
    expect(getToken).toHaveBeenNthCalledWith(
      2,
      "market-listings/b.png",
      "image/png",
    );
    expect(result.current.error).toBeNull();
  });

  it("posts the signed fields first and the file last", async () => {
    vi.stubGlobal("fetch", fetchMock.mockResolvedValue({ ok: true }));
    const getToken = vi.fn().mockResolvedValue(token("a.png"));

    const { result } = renderHook(() =>
      useBlobUpload("market-listings", getToken),
    );
    await act(async () => {
      await result.current.uploadFiles([file("a.png")]);
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://files.example/meeples");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect([...form.keys()]).toEqual(["key", "Policy", "file"]);
    expect(form.get("key")).toBe("market-listings/a.png");
  });

  it("falls back to a generic content type when the browser reports none", async () => {
    vi.stubGlobal("fetch", fetchMock.mockResolvedValue({ ok: true }));
    const getToken = vi.fn().mockResolvedValue(token("a.bin"));

    const { result } = renderHook(() => useBlobUpload("downloads", getToken));
    await act(async () => {
      await result.current.uploadFiles([new File(["x"], "a.bin")]);
    });

    expect(getToken).toHaveBeenCalledWith(
      "downloads/a.bin",
      "application/octet-stream",
    );
  });

  it("reports the HTTP status when the bucket rejects the upload", async () => {
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValue({ ok: false, status: 400 }),
    );
    const getToken = vi.fn().mockResolvedValue(token("a.png"));

    const { result } = renderHook(() =>
      useBlobUpload("market-listings", getToken),
    );

    let urls: string[] = ["unchanged"];
    await act(async () => {
      urls = await result.current.uploadFiles([file("a.png")]);
    });

    expect(urls).toEqual([]);
    await waitFor(() =>
      expect(result.current.error).toBe(
        "Datei(en) konnten nicht hochgeladen werden: Speicher antwortete mit HTTP 400",
      ),
    );
  });

  it("reports an error and returns no urls when the token request fails", async () => {
    const getToken = vi.fn().mockRejectedValue(new Error("network error"));

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
