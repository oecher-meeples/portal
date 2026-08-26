import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

/** DOM helpers shared by the split `create-board-game-dialog.*.test.tsx` files (#183). */

export async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Spiel anlegen" }));
  return screen.findByRole("dialog");
}

export function submitButton(dialog: HTMLElement) {
  return within(dialog).getByRole("button", {
    name: /Spiel anlegen|Speichere/,
  });
}

/** Schritt 1 (BGG-Import) explizit überspringen — landet direkt bei Schritt 2. */
export async function skipImportStep(
  dialog: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    within(dialog).getByRole("button", { name: "Ohne Import fortfahren" }),
  );
}

export async function goNext(
  dialog: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(within(dialog).getByRole("button", { name: "Weiter" }));
}

export async function submitBggInput(
  dialog: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
  value: string,
) {
  await user.type(within(dialog).getByLabelText(/Titel, BGG-Link/), value);
  await user.click(within(dialog).getByRole("button", { name: "Suchen" }));
}
