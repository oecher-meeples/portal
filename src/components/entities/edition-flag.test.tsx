import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EditionFlag } from "@/components/entities/edition-flag";

afterEach(cleanup);

describe("EditionFlag", () => {
  it("renders a flag for a non-German edition", () => {
    render(<EditionFlag languages={["English"]} />);

    expect(
      screen.getByRole("img", { name: "Edition: English" }),
    ).toBeInTheDocument();
  });

  it("renders nothing for a German or unknown edition", () => {
    const { container, rerender } = render(
      <EditionFlag languages={["German"]} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<EditionFlag languages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
