import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContributorPill } from "@/components/entities/contributor-pill";

afterEach(cleanup);

describe("ContributorPill", () => {
  it("labels each role icon with the German role name", () => {
    render(
      <ContributorPill name="Klaus Teuber" roles={["AUTHOR", "ILLUSTRATOR"]} />,
    );

    expect(screen.getByText("Klaus Teuber")).toBeInTheDocument();
    expect(screen.getByLabelText("Autor")).toBeInTheDocument();
    expect(screen.getByLabelText("Illustrator")).toBeInTheDocument();
  });

  it("labels the publisher icon", () => {
    render(<ContributorPill name="Kosmos" roles={["PUBLISHER"]} />);

    expect(screen.getByLabelText("Verlag")).toBeInTheDocument();
  });
});

describe("ContributorPill tooltip", () => {
  it("shows all role names when hovering the name, not just the icon", async () => {
    const user = userEvent.setup();
    render(
      <ContributorPill name="Klaus Teuber" roles={["AUTHOR", "ILLUSTRATOR"]} />,
    );

    await user.hover(screen.getByText("Klaus Teuber"));

    expect(await screen.findByText("Autor, Illustrator")).toBeInTheDocument();
  });
});
