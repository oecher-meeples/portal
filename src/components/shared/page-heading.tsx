import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        {eyebrow}
      </p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {action}
      </div>
      {description && (
        <p className="max-w-2xl text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
