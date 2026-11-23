import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RuleBookLanguagesField } from "@/components/widgets/board-game/rule-book-languages-field";

afterEach(() => {
  cleanup();
});

describe("RuleBookLanguagesField", () => {
  it("renders a checkbox for every rule book language", () => {
    render(
      <RuleBookLanguagesField idPrefix="test" value={[]} onChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("Deutsch")).toBeInTheDocument();
    expect(screen.getByLabelText("Englisch")).toBeInTheDocument();
    expect(screen.getByLabelText("Sonstige")).toBeInTheDocument();
  });

  it("adds a language when its checkbox is checked", () => {
    const onChange = vi.fn();
    render(
      <RuleBookLanguagesField idPrefix="test" value={[]} onChange={onChange} />,
    );

    fireEvent.click(screen.getByLabelText("Deutsch"));

    expect(onChange).toHaveBeenCalledWith(["DE"]);
  });

  it("supports selecting multiple languages at once", () => {
    const onChange = vi.fn();
    render(
      <RuleBookLanguagesField
        idPrefix="test"
        value={["DE"]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("Englisch"));

    expect(onChange).toHaveBeenCalledWith(["DE", "EN"]);
  });

  it("removes a language when its checkbox is unchecked", () => {
    const onChange = vi.fn();
    render(
      <RuleBookLanguagesField
        idPrefix="test"
        value={["DE", "EN"]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("Deutsch"));

    expect(onChange).toHaveBeenCalledWith(["EN"]);
  });
});
