"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useAction, type ActionResult } from "@/components/ui/use-action";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Button that runs a server action, showing pending state and any error the
 * action returns. Replaces the per-feature `Delete<Thing>Button` wrappers.
 * Pass server actions pre-bound (`deletePost.bind(null, id)`) so this works
 * from server components too.
 */
export function ActionButton({
  action,
  confirm,
  onSuccess,
  refresh,
  children,
  pendingLabel,
  wrapperClassName,
  errorClassName,
  disabled,
  ...buttonProps
}: Omit<ButtonProps, "onClick"> & {
  action: () => Promise<ActionResult>;
  /** When set, ask for confirmation before running. */
  confirm?: string;
  onSuccess?: () => void;
  refresh?: boolean;
  children: ReactNode;
  pendingLabel?: ReactNode;
  wrapperClassName?: string;
  errorClassName?: string;
}) {
  const { run, pending, error } = useAction({ refresh, onSuccess });

  async function handleClick() {
    if (confirm && !window.confirm(confirm)) return;
    await run(action);
  }

  const button = (
    <Button
      {...buttonProps}
      onClick={handleClick}
      disabled={disabled || pending}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );

  if (!error) return button;

  return (
    <div className={cn("flex flex-col items-end gap-1", wrapperClassName)}>
      {button}
      <p
        className={cn(
          "text-destructive max-w-48 text-right text-xs",
          errorClassName,
        )}
      >
        {error}
      </p>
    </div>
  );
}
