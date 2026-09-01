import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const VARIANT_CLASSES = {
  default: "max-w-6xl",
  wide: "max-w-screen-2xl",
} as const;

/**
 * Page-level width cap, previously hardcoded once in `AppShell` for every
 * route (#398). Each page now opts into its own width instead — `default`
 * keeps today's `max-w-6xl` reading width, `wide` is for content-heavy
 * grid/list pages (e.g. Ludothek) that should use more of a wide screen.
 */
export function PageContainer({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
