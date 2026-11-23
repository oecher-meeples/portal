import { describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { UserFacingError, actionErrorMessage, toResult } from "./action-result";

describe("actionErrorMessage", () => {
  it("rethrows a redirect() instead of turning it into a message", () => {
    let caught: unknown;
    try {
      redirect("/login");
    } catch (error) {
      caught = error;
    }
    expect(() => actionErrorMessage(caught)).toThrow(/NEXT_REDIRECT/);
  });

  it("rethrows notFound()", () => {
    let caught: unknown;
    try {
      notFound();
    } catch (error) {
      caught = error;
    }
    expect(() => actionErrorMessage(caught)).toThrow();
  });

  it("passes the message of a UserFacingError through", () => {
    expect(actionErrorMessage(new UserFacingError("Keine Berechtigung."))).toBe(
      "Keine Berechtigung.",
    );
  });

  it("hides the message of any other error", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(actionErrorMessage(new Error("Prisma: connection refused"))).toBe(
      "Unbekannter Fehler.",
    );
    expect(actionErrorMessage("not even an error")).toBe("Unbekannter Fehler.");
    consoleError.mockRestore();
  });
});

describe("toResult", () => {
  it("returns the value and runs onSuccess", async () => {
    const onSuccess = vi.fn();
    expect(await toResult(() => 42, onSuccess)).toEqual({
      success: true,
      value: 42,
    });
    expect(onSuccess).toHaveBeenCalledWith(42);
  });

  it("maps a UserFacingError to { error } and skips onSuccess", async () => {
    const onSuccess = vi.fn();
    const result = await toResult(() => {
      throw new UserFacingError("Nicht erlaubt.");
    }, onSuccess);
    expect(result).toEqual({ error: "Nicht erlaubt." });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("lets a redirect() propagate", async () => {
    await expect(
      toResult(() => {
        redirect("/login");
      }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });
});
