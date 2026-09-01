import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "@/components/ui/search-input";

afterEach(() => {
  cleanup();
});

describe("SearchInput", () => {
  it("shows no clear button while empty", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Suche zurücksetzen" }),
    ).not.toBeInTheDocument();
  });

  it("shows a clear button once a value is entered, clearing it on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchInput value="Erika" onChange={onChange} />);

    await user.click(
      screen.getByRole("button", { name: "Suche zurücksetzen" }),
    );

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("forwards typed input via onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchInput value="" onChange={onChange} placeholder="Suchen …" />,
    );

    await user.type(screen.getByPlaceholderText("Suchen …"), "a");

    expect(onChange).toHaveBeenCalledWith("a");
  });
});
