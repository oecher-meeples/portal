"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAction, type ActionResult } from "@/components/ui/use-action";

/**
 * The dialog skeleton every mutating dialog in this app shares: open state,
 * reset-on-close, an error slot, and a footer submit button that closes the
 * dialog and refreshes the route on success.
 *
 * Callers supply only the trigger, the copy and the body fields.
 */
export function ActionDialog({
  trigger,
  title,
  description,
  children,
  submitLabel,
  pendingLabel = "Speichere…",
  submitVariant,
  submitClassName,
  canSubmit = true,
  action,
  onReset,
  onOpen,
}: {
  /** Complete trigger element, including its label. */
  trigger: ReactElement;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  submitVariant?: React.ComponentProps<typeof Button>["variant"];
  submitClassName?: string;
  /** Set false while required fields are empty. */
  canSubmit?: boolean;
  action: () => Promise<ActionResult>;
  /** Clear caller-owned form state when the dialog closes. */
  onReset?: () => void;
  /** Load data the dialog needs when it opens. */
  onOpen?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const { run, pending, error, setError } = useAction({
    onSuccess: () => {
      setOpen(false);
      onReset?.();
    },
  });

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    setError(null);
    if (nextOpen) {
      await onOpen?.();
    } else {
      onReset?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button
            variant={submitVariant}
            className={submitClassName}
            disabled={pending || !canSubmit}
            onClick={() => run(action)}
          >
            {pending ? pendingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
