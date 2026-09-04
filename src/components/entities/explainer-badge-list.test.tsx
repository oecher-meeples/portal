import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ExplainerBadgeList } from "@/components/entities/explainer-badge-list";
import type { ExplainerEntry } from "@/lib/explainer/queries";

afterEach(cleanup);

function explainer(overrides: Partial<ExplainerEntry> = {}): ExplainerEntry {
  return {
    meepleId: "meeple-1",
    displayName: "Lea Demo",
    level: "BY_HEART",
    profilePictureUrl: null,
    profilePictureVisibility: "INTERN",
    ...overrides,
  };
}

describe("ExplainerBadgeList", () => {
  it("shows the empty label without any explainer", () => {
    render(<ExplainerBadgeList explainers={[]} />);

    expect(
      screen.getByText("Noch keine Erklärbären eingetragen."),
    ).toBeInTheDocument();
  });

  it("renders the name as a clickable ContactDialog trigger, not plain text (#412-Folgefeedback)", () => {
    render(<ExplainerBadgeList explainers={[explainer()]} />);

    expect(
      screen.getByRole("button", { name: "Lea Demo" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Im Schlaf")).toBeInTheDocument();
  });
});
