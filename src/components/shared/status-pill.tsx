import { cn } from "@/lib/utils";

const TONES = {
  positive: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  negative: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
} as const;

export type StatusTone = keyof typeof TONES;

export function StatusPill({
  label,
  tone,
  className,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
