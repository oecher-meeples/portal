import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FileField } from "./file-field";

afterEach(() => {
  cleanup();
});

function makeFile(name: string) {
  return new File(["content"], name, { type: "text/csv" });
}

describe("FileField", () => {
  it("reports the file chosen via the native input", () => {
    const onFilesSelected = vi.fn();
    render(
      <FileField id="f" label="Datei" onFilesSelected={onFilesSelected} />,
    );

    const file = makeFile("import.csv");
    const input = document.getElementById("f") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(screen.getByText("import.csv")).toBeInTheDocument();
  });

  it("reports a file dropped onto the field", () => {
    const onFilesSelected = vi.fn();
    render(
      <FileField id="f" label="Datei" onFilesSelected={onFilesSelected} />,
    );

    const file = makeFile("dropped.csv");
    const dropzone = screen.getByText("Datei auswählen").parentElement!;
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(screen.getByText("dropped.csv")).toBeInTheDocument();
  });

  it("ignores drops while disabled", () => {
    const onFilesSelected = vi.fn();
    render(
      <FileField
        id="f"
        label="Datei"
        disabled
        onFilesSelected={onFilesSelected}
      />,
    );

    const dropzone = screen.getByText("Datei auswählen").parentElement!;
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeFile("dropped.csv")] },
    });

    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});
