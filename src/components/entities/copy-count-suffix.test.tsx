import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CopyCountSuffix } from "@/components/entities/copy-count-suffix";

afterEach(() => {
  cleanup();
});

describe("CopyCountSuffix", () => {
  it("renders nothing when unset", () => {
    render(<CopyCountSuffix />);

    expect(screen.queryByText(/\(x/)).not.toBeInTheDocument();
  });

  it("renders nothing for exactly one copy", () => {
    render(<CopyCountSuffix copyCount={1} />);

    expect(screen.queryByText(/\(x/)).not.toBeInTheDocument();
  });

  it("renders (x2) for two copies", () => {
    render(<CopyCountSuffix copyCount={2} />);

    expect(screen.getByText("(x2)")).toBeInTheDocument();
  });
});
