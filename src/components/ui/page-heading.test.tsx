import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PageHeading } from "./page-heading";

afterEach(cleanup);

describe("PageHeading — action am rechten Rand (#408)", () => {
  it("gives the eyebrow/title block flex-1 so justify-between can push the action to the edge", () => {
    render(
      <PageHeading
        eyebrow="Bereich"
        title="Titel"
        action={<button>Aktion</button>}
      />,
    );

    const title = screen.getByRole("heading", { name: "Titel" });
    const titleBlock = title.parentElement?.parentElement;
    expect(titleBlock).toHaveClass("flex-1");
  });

  it("still renders the media slot next to the title block (Regressionscheck)", () => {
    render(
      <PageHeading
        eyebrow="Bereich"
        title="Titel"
        // eslint-disable-next-line @next/next/no-img-element -- Test-Fixture, kein echtes Bild
        media={<img alt="Profilbild" src="/avatar.png" />}
      />,
    );

    expect(screen.getByAltText("Profilbild")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Titel" })).toBeInTheDocument();
  });
});
